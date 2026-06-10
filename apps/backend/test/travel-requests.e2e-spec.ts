import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Travel Requests (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let adminToken: string;
  let adminTenantId: string;
  let employeeToken: string;
  let requestId: string;

  const tenant = {
    tenantName: 'Travel Corp',
    slug: 'travel-corp',
    email: 'admin@travel.com',
    password: 'SecurePass1',
    firstName: 'Travel',
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
        dailyRate: 90,
        currency: 'USD',
        priority: 10,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .send({
        name: 'US Default',
        countryCode: 'US',
        role: null,
        dailyRate: 120,
        currency: 'USD',
        priority: 5,
      })
      .expect(201);

    const inviteToken = (
      await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'employee@travel.com',
          firstName: 'Emp',
          lastName: 'Loyee',
          role: 'employee',
        })
    ).body.data.inviteToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/accept-invite')
      .send({ token: inviteToken, password: 'EmployeePass1' });

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantSlug: tenant.slug,
        email: 'employee@travel.com',
        password: 'EmployeePass1',
      });

    employeeToken = login.body.data.tokens.accessToken;
  }, 180000);

  afterAll(async () => {
    await closeE2EApp({ app, connection });
  });

  describe('Create with auto calculation', () => {
    it('employee should create a draft travel request with calculated per diem', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/travel-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          title: 'NYC client visit',
          purpose: 'Quarterly review',
          destinationCountryCode: 'US',
          destinationCity: 'New York',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
        })
        .expect(201);

      requestId = response.body.data.id;
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.days).toBe(3);
      expect(response.body.data.dailyRate).toBe(90);
      expect(response.body.data.totalAmount).toBe(270);
      expect(response.body.data.policyName).toBe('US Employee Standard');
    });

    it('should fail when no policy matches destination', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/travel-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          title: 'Tokyo trip',
          destinationCountryCode: 'JP',
          startDate: '2026-08-01',
          endDate: '2026-08-02',
        })
        .expect(404);

      expect(response.body.code).toBe('POLICY_RULE_NOT_FOUND');
    });
  });

  describe('Status management', () => {
    it('employee should submit a draft request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/travel-requests/${requestId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(201);

      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.submittedAt).toBeTruthy();
    });

    it('should not update a submitted request', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/travel-requests/${requestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({ title: 'Updated title' })
        .expect(409);

      expect(response.body.code).toBe('TRAVEL_REQUEST_INVALID_STATUS');
    });

    it('employee should cancel a submitted request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/travel-requests/${requestId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(201);

      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.cancelledAt).toBeTruthy();
    });
  });

  describe('Access control', () => {
    it('admin should list all tenant travel requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/travel-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('employee should only see own requests in list', async () => {
      const adminRequest = await request(app.getHttpServer())
        .post('/api/v1/travel-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          title: 'Admin trip',
          destinationCountryCode: 'US',
          startDate: '2026-09-01',
          endDate: '2026-09-02',
        })
        .expect(201);

      const employeeList = await request(app.getHttpServer())
        .get('/api/v1/travel-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      const ids = employeeList.body.data.items.map((item: { id: string }) => item.id);
      expect(ids).toContain(requestId);
      expect(ids).not.toContain(adminRequest.body.data.id);
    });

    it('employee should not access another users request by id', async () => {
      const adminRequest = await request(app.getHttpServer())
        .post('/api/v1/travel-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          title: 'Private admin trip',
          destinationCountryCode: 'US',
          startDate: '2026-10-01',
          endDate: '2026-10-02',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/travel-requests/${adminRequest.body.data.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(403);

      expect(response.body.code).toBe('TRAVEL_REQUEST_FORBIDDEN');
    });
  });
});
