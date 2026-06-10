import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import helmet from 'helmet';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.APP_NAME = 'perdiem-management-system';
    process.env.APP_PORT = '3001';
    process.env.APP_URL = 'http://localhost:3001';
    process.env.CORS_ORIGINS = 'http://localhost:3002';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/perdiem-test';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-characters!!';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-characters!';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.LOG_LEVEL = 'error';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(helmet());
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
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

    it('GET /api/v1/health/ready should return ready', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body.data.status).toBe('ready');
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
