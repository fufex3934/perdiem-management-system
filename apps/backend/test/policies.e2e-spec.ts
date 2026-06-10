import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Policies (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let adminToken: string;
  let adminTenantId: string;
  let employeeToken: string;
  let policyId: string;

  const tenant = {
    tenantName: 'Policy Corp',
    slug: 'policy-corp',
    email: 'admin@policy.com',
    password: 'SecurePass1',
    firstName: 'Policy',
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
  }, 180000);

  afterAll(async () => {
    await closeE2EApp({ app, connection });
  });

  describe('Policy CRUD', () => {
    it('admin should create a per diem policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          name: 'US Employee Standard',
          countryCode: 'US',
          role: 'employee',
          dailyRate: 85,
          currency: 'USD',
          priority: 10,
        })
        .expect(201);

      policyId = response.body.data.id;
      expect(response.body.data.countryCode).toBe('US');
      expect(response.body.data.dailyRate).toBe(85);
    });

    it('admin should list policies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/policies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('employee without write permission should not create policy', async () => {
      const inviteToken = (
        await request(app.getHttpServer())
          .post('/api/v1/users/invites')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-Id', adminTenantId)
          .send({
            email: 'emp2@policy.com',
            firstName: 'Emp2',
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
          email: 'emp2@policy.com',
          password: 'EmployeePass1',
        });

      employeeToken = login.body.data.tokens.accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          name: 'Blocked',
          countryCode: 'DE',
          dailyRate: 50,
          currency: 'EUR',
        })
        .expect(403);
    });
  });

  describe('Calculation engine', () => {
    it('should calculate per diem for matching policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/policies/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          countryCode: 'US',
          role: 'employee',
          days: 5,
        })
        .expect(201);

      expect(response.body.data.totalAmount).toBe(425);
      expect(response.body.data.policyId).toBe(policyId);
    });

    it('employee should be allowed to calculate', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/policies/calculate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          countryCode: 'US',
          role: 'employee',
          days: 2,
        })
        .expect(201);

      expect(response.body.data.totalAmount).toBe(170);
    });

    it('should return 404 when no policy matches', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/policies/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          countryCode: 'JP',
          role: 'employee',
          days: 3,
        })
        .expect(404);

      expect(response.body.code).toBe('POLICY_RULE_NOT_FOUND');
    });

    it('should prefer role-specific policy over default', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          name: 'US Default',
          countryCode: 'US',
          role: null,
          dailyRate: 50,
          currency: 'USD',
          priority: 100,
        });

      const response = await request(app.getHttpServer())
        .post('/api/v1/policies/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          countryCode: 'US',
          role: 'employee',
          days: 1,
        })
        .expect(201);

      expect(response.body.data.dailyRate).toBe(85);
      expect(response.body.data.policyName).toBe('US Employee Standard');
    });
  });
});
