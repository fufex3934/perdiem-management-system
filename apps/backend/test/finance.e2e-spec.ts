import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Finance (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let adminToken: string;
  let adminTenantId: string;
  let managerToken: string;
  let employeeToken: string;
  let paymentId: string;

  const tenant = {
    tenantName: 'Finance Corp',
    slug: 'finance-corp',
    email: 'admin@finance.com',
    password: 'SecurePass1',
    firstName: 'Finance',
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
        dailyRate: 80,
        currency: 'USD',
        priority: 10,
      })
      .expect(201);

    const managerInvite = (
      await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'manager@finance.com',
          firstName: 'Man',
          lastName: 'Ager',
          role: 'manager',
        })
    ).body.data.inviteToken;

    const employeeInvite = (
      await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'employee@finance.com',
          firstName: 'Emp',
          lastName: 'Loyee',
          role: 'employee',
        })
    ).body.data.inviteToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/accept-invite')
      .send({ token: managerInvite, password: 'ManagerPass1' });

    await request(app.getHttpServer())
      .post('/api/v1/auth/accept-invite')
      .send({ token: employeeInvite, password: 'EmployeePass1' });

    managerToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: tenant.slug,
          email: 'manager@finance.com',
          password: 'ManagerPass1',
        })
    ).body.data.tokens.accessToken;

    employeeToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: tenant.slug,
          email: 'employee@finance.com',
          password: 'EmployeePass1',
        })
    ).body.data.tokens.accessToken;

    const travelRequest = await request(app.getHttpServer())
      .post('/api/v1/travel-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .send({
        title: 'Finance test trip',
        destinationCountryCode: 'US',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
      })
      .expect(201);

    const requestId = travelRequest.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/travel-requests/${requestId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/approvals/travel-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/approvals/travel-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .send({})
      .expect(201);
  }, 180000);

  afterAll(async () => {
    await closeE2EApp({ app, connection });
  });

  describe('Payment lifecycle', () => {
    it('should auto-create pending payment after full approval', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
      const payment = response.body.data.items[0];
      paymentId = payment.id;
      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(240);
      expect(payment.travelTitle).toBe('Finance test trip');
    });

    it('employee should see own payment only', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0].id).toBe(paymentId);
    });

    it('employee should not mark payment as paid', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/finance/payments/${paymentId}/mark-paid`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({ paymentReference: 'REF-001' })
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('admin should mark payment as paid', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/finance/payments/${paymentId}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({ paymentReference: 'REF-001', notes: 'Wire transfer' })
        .expect(201);

      expect(response.body.data.status).toBe('paid');
      expect(response.body.data.paymentReference).toBe('REF-001');
      expect(response.body.data.paidAt).toBeTruthy();
    });
  });

  describe('Export', () => {
    it('manager should export payments as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/payments/export')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(response.body.data.rowCount).toBeGreaterThanOrEqual(1);
      expect(response.body.data.csv).toContain('payment_id');
      expect(response.body.data.csv).toContain('Finance test trip');
      expect(response.body.data.filename).toContain('.csv');
    });

    it('employee should not export all tenant payments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/payments/export')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
