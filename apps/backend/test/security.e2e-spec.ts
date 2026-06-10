import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Security (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let adminToken: string;
  let adminTenantId: string;
  let employeeToken: string;

  const tenant = {
    tenantName: 'Security Corp',
    slug: 'security-corp',
    email: 'admin@security.com',
    password: 'SecurePass1',
    firstName: 'Security',
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

    const employeeInvite = (
      await request(app.getHttpServer())
        .post('/api/v1/users/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .send({
          email: 'employee@security.com',
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
          email: 'employee@security.com',
          password: 'EmployeePass1',
        })
    ).body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await closeE2EApp(app, connection);
  });

  it('records login success in security audit logs', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/security/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(200);

    const actions = response.body.data.items.map(
      (item: { action: string }) => item.action,
    );

    expect(actions).toContain('auth.login_success');
    expect(actions).toContain('auth.register_tenant');
  });

  it('denies audit log access to employees', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/security/audit-logs')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(403);
  });

  it('returns rate limit error after repeated failed logins', async () => {
    let rateLimited = false;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: tenant.slug,
          email: 'wrong@security.com',
          password: 'WrongPass1',
        });

      if (response.status === 429) {
        rateLimited = true;
        expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        break;
      }
    }

    expect(rateLimited).toBe(true);
  });
});
