import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let adminToken: string;
  let adminTenantId: string;
  let employeeToken: string;

  const tenant = {
    tenantName: 'Analytics Corp',
    slug: 'analytics-corp',
    email: 'admin@analytics.com',
    password: 'SecurePass1',
    firstName: 'Analytics',
    lastName: 'Admin',
  };

  beforeAll(async () => {
    const context = await createE2EApp();
    app = context.app;
    connection = context.connection;

    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register-tenant')
      .send(tenant);

    adminToken = register.body.data.tokens.accessToken;
    adminTenantId = register.body.data.user.tenantId;

    await request(app.getHttpServer())
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .send({
        name: 'US Employee Standard',
        countryCode: 'US',
        role: 'employee',
        dailyRate: 100,
        currency: 'USD',
        priority: 10,
      })
      .expect(201);

    const employeeInvite = (
      await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'employee@analytics.com',
          firstName: 'Emp',
          lastName: 'Loyee',
          role: 'employee',
        })
    ).body.data.inviteToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/accept-invite')
      .send({ token: employeeInvite, password: 'EmployeePass1' });

    employeeToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: tenant.slug,
          email: 'employee@analytics.com',
          password: 'EmployeePass1',
        })
    ).body.data.tokens.accessToken;

    const travelRequest = await request(app.getHttpServer())
      .post('/api/v1/travel-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .send({
        title: 'Analytics test trip',
        destinationCountryCode: 'US',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
      })
      .expect(201);

    const requestId = travelRequest.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/travel-requests/${requestId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(201);
  });

  afterAll(async () => {
    await closeE2EApp(app, connection);
  });

  it('returns tenant dashboard for admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(200);

    expect(response.body.data.scope).toBe('tenant');
    expect(response.body.data.travelRequests.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.pendingApprovals).toBeGreaterThanOrEqual(1);
  });

  it('returns own dashboard for employee', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(200);

    expect(response.body.data.scope).toBe('own');
    expect(response.body.data.travelRequests.total).toBe(1);
  });

  it('returns spend report with country breakdown', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/spend')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(200);

    expect(response.body.data.totalTravelRequests).toBeGreaterThanOrEqual(1);
    expect(response.body.data.byCountry.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.byCountry[0].countryCode).toBe('US');
  });

  it('exports spend report for admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/spend/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(200);

    expect(response.body.data.filename).toMatch(/spend-report/);
    expect(response.body.data.csv).toContain('country_code');
  });

  it('denies spend export for employee', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/spend/export')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(403);
  });
});
