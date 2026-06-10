import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let adminToken: string;
  let adminTenantId: string;
  let managerToken: string;
  let employeeToken: string;

  const tenant = {
    tenantName: 'Notify Corp',
    slug: 'notify-corp',
    email: 'admin@notify.com',
    password: 'SecurePass1',
    firstName: 'Notify',
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
        dailyRate: 75,
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
          email: 'manager@notify.com',
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
          email: 'employee@notify.com',
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
          email: 'manager@notify.com',
          password: 'ManagerPass1',
        })
    ).body.data.tokens.accessToken;

    employeeToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: tenant.slug,
          email: 'employee@notify.com',
          password: 'EmployeePass1',
        })
    ).body.data.tokens.accessToken;

    const travelRequest = await request(app.getHttpServer())
      .post('/api/v1/travel-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .send({
        title: 'Notification test trip',
        destinationCountryCode: 'US',
        startDate: '2026-12-01',
        endDate: '2026-12-02',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/travel-requests/${travelRequest.body.data.id}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Tenant-Id', adminTenantId)
      .expect(201);
  }, 180000);

  afterAll(async () => {
    await closeE2EApp({ app, connection });
  });

  describe('Event-driven notifications', () => {
    it('manager should receive approval required notification', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      const types = response.body.data.items.map((item: { type: string }) => item.type);
      expect(types).toContain('approval_required');
    });

    it('should return unread count', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(response.body.data.count).toBeGreaterThanOrEqual(1);
    });

    it('employee should not see manager notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      const types = response.body.data.items.map((item: { type: string }) => item.type);
      expect(types).not.toContain('approval_required');
    });

    it('should mark notification as read', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      const notificationId = list.body.data.items[0].id;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Tenant-Id', adminTenantId)
        .expect(200);

      expect(response.body.data.readAt).toBeTruthy();
    });
  });
});
