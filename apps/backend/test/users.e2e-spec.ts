import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Users & RBAC (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  const adminUser = {
    tenantName: 'RBAC Corp',
    slug: 'rbac-corp',
    email: 'admin@rbac.com',
    password: 'SecurePass1',
    firstName: 'Admin',
    lastName: 'User',
  };

  let adminToken: string;
  let adminTenantId: string;
  let employeeToken: string;
  let inviteToken: string;

  beforeAll(async () => {
    const context = await createE2EApp();
    app = context.app;
    connection = context.connection;

    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register-tenant')
      .send(adminUser);

    adminToken = register.body.data.tokens.accessToken;
    adminTenantId = register.body.data.user.tenantId;
  }, 180000);

  afterAll(async () => {
    await closeE2EApp({ app, connection });
  });

  describe('RBAC enforcement', () => {
    it('employee should not list users', async () => {
      const invite = await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'employee@rbac.com',
          firstName: 'Emp',
          lastName: 'Loyee',
          role: 'employee',
        })
        .expect(201);

      inviteToken = invite.body.data.inviteToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/accept-invite')
        .send({
          token: inviteToken,
          password: 'EmployeePass1',
        })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: adminUser.slug,
          email: 'employee@rbac.com',
          password: 'EmployeePass1',
        });

      employeeToken = login.body.data.tokens.accessToken;

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('admin should list users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(response.body.data.items.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Invite flow', () => {
    it('admin should create and list invites', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'manager@rbac.com',
          firstName: 'Man',
          lastName: 'Ager',
          role: 'manager',
        })
        .expect(201);

      expect(create.body.data.inviteToken).toBeDefined();
      expect(create.body.data.acceptUrl).toContain('/invite/accept?token=');

      const list = await request(app.getHttpServer())
        .get('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(list.body.data.some((item: { email: string }) => item.email === 'manager@rbac.com')).toBe(
        true,
      );
    });

    it('pending user cannot login before accepting invite', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'pending@rbac.com',
          firstName: 'Pen',
          lastName: 'Ding',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: adminUser.slug,
          email: 'pending@rbac.com',
          password: 'AnyPass123',
        })
        .expect(403);
    });
  });

  describe('User management', () => {
    it('admin should not delete themselves', async () => {
      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${me.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(403);
    });
  });
});
