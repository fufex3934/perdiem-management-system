import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Approvals (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let adminToken: string;
  let adminTenantId: string;
  let managerToken: string;
  let employeeToken: string;
  let requestId: string;

  const tenant = {
    tenantName: 'Approval Corp',
    slug: 'approval-corp',
    email: 'admin@approval.com',
    password: 'SecurePass1',
    firstName: 'Approval',
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

    const managerInvite = (
      await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'manager@approval.com',
          firstName: 'Man',
          lastName: 'Ager',
          role: 'manager',
        })
    ).body.data.inviteToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/accept-invite')
      .send({ token: managerInvite, password: 'ManagerPass1' });

    const employeeInvite = (
      await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'employee@approval.com',
          firstName: 'Emp',
          lastName: 'Loyee',
          role: 'employee',
        })
    ).body.data.inviteToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/accept-invite')
      .send({ token: employeeInvite, password: 'EmployeePass1' });

    managerToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: tenant.slug,
          email: 'manager@approval.com',
          password: 'ManagerPass1',
        })
    ).body.data.tokens.accessToken;

    employeeToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: tenant.slug,
          email: 'employee@approval.com',
          password: 'EmployeePass1',
        })
    ).body.data.tokens.accessToken;
  }, 180000);

  afterAll(async () => {
    await closeE2EApp({ app, connection });
  });

  describe('Multi-step approval workflow', () => {
    it('employee should create and submit a travel request', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/travel-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          title: 'SF conference',
          destinationCountryCode: 'US',
          startDate: '2026-09-01',
          endDate: '2026-09-03',
        })
        .expect(201);

      requestId = created.body.data.id;

      const submitted = await request(app.getHttpServer())
        .post(`/api/v1/travel-requests/${requestId}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(201);

      expect(submitted.body.data.status).toBe('pending_approval');
      expect(submitted.body.data.approvalSteps).toHaveLength(2);
      expect(submitted.body.data.currentStepIndex).toBe(0);
    });

    it('manager should see request in pending approvals', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/pending')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      const ids = response.body.data.items.map((item: { id: string }) => item.id);
      expect(ids).toContain(requestId);
    });

    it('manager should approve step 1', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/approvals/travel-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({ comment: 'Approved by manager' })
        .expect(201);

      expect(response.body.data.status).toBe('pending_approval');
      expect(response.body.data.currentStepIndex).toBe(1);
      expect(response.body.data.approvalSteps[0].status).toBe('approved');
    });

    it('manager should not approve step 2 (tenant admin required)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/approvals/travel-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({})
        .expect(403);

      expect(response.body.code).toBe('APPROVAL_NOT_AUTHORIZED');
    });

    it('admin should complete final approval', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/approvals/travel-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({ comment: 'Final approval' })
        .expect(201);

      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.approvedAt).toBeTruthy();
      expect(response.body.data.currentStepIndex).toBe(-1);
    });

    it('should return audit trail with all actions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/approvals/travel-requests/${requestId}/audit-trail`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      const actions = response.body.data.map((entry: { action: string }) => entry.action);
      expect(actions).toContain('submit');
      expect(actions).toContain('approve');
      expect(actions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Rejection workflow', () => {
    it('manager should reject a submitted request', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/travel-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          title: 'Rejected trip',
          destinationCountryCode: 'US',
          startDate: '2026-10-01',
          endDate: '2026-10-02',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/travel-requests/${created.body.data.id}/submit`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/approvals/travel-requests/${created.body.data.id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({ comment: 'Not business critical' })
        .expect(201);

      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectionComment).toBe('Not business critical');
    });
  });
});
