import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  const testUser = {
    tenantName: 'Acme Corporation',
    slug: 'acme-corp',
    email: 'admin@acme.com',
    password: 'SecurePass1',
    firstName: 'Jane',
    lastName: 'Admin',
  };

  beforeAll(async () => {
    const context = await createE2EApp();
    app = context.app;
    connection = context.connection;
  }, 180000);

  afterAll(async () => {
    await closeE2EApp({ app, connection });
  });

  describe('POST /api/v1/auth/register-tenant', () => {
    it('should register a tenant and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register-tenant')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.role).toBe('tenant_admin');
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject duplicate tenant slug', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register-tenant')
        .send({
          ...testUser,
          email: 'other@acme.com',
        })
        .expect(409);

      expect(response.body.code).toBe('TENANT_SLUG_EXISTS');
    });

    it('should reject weak passwords', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register-tenant')
        .send({
          tenantName: 'Beta Inc',
          slug: 'beta-inc',
          email: 'admin@beta.com',
          password: 'weak',
          firstName: 'Bob',
          lastName: 'User',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: testUser.slug,
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.user.tenantId).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: testUser.slug,
          email: testUser.email,
          password: 'WrongPass1',
        })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Protected routes', () => {
    let accessToken: string;
    let refreshToken: string;
    let tenantId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: testUser.slug,
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
      tenantId = response.body.data.user.tenantId;
    });

    it('GET /api/v1/auth/me should return profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      expect(response.body.data.email).toBe(testUser.email);
    });

    it('GET /api/v1/auth/me should reject without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('GET /api/v1/auth/me should reject tenant mismatch', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Tenant-Id', '000000000000000000000000')
        .expect(403);

      expect(response.body.code).toBe('TENANT_MISMATCH');
    });

    it('POST /api/v1/auth/refresh should issue new tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('POST /api/v1/auth/logout should revoke session', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: testUser.slug,
          email: testUser.email,
          password: testUser.password,
        });

      const token = login.body.data.tokens.accessToken;
      const rt = login.body.data.tokens.refreshToken;
      const tid = login.body.data.user.tenantId;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tid)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rt })
        .expect(401);
    });
  });
});
