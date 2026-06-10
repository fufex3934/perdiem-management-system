import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { closeE2EApp, createE2EApp } from './e2e-app.helper';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    const context = await createE2EApp();
    app = context.app;
    connection = context.connection;
  }, 180000);

  afterAll(async () => {
    await closeE2EApp({ app, connection });
  });

  describe('Health endpoints', () => {
    it('GET /api/v1/health/live should return ok', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body.data.status).toBe('ok');
      expect(response.body.success).toBe(true);
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('GET /api/v1/health/ready should return mongodb health', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.info.mongodb.status).toBe('up');
    });

    it('GET /api/v1/health should return health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.info).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('GET /api/v1/nonexistent should return 404 with structured error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.path).toBe('/api/v1/nonexistent');
    });
  });

  describe('Request ID middleware', () => {
    it('should propagate custom X-Request-Id header', async () => {
      const customRequestId = 'custom-request-id-12345';

      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('X-Request-Id', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
      expect(response.body.requestId).toBe(customRequestId);
    });
  });
});
