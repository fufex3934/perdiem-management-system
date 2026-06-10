import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';
import { startMongoMemoryServer, stopMongoMemoryServer } from './mongodb-memory';

export interface E2EAppContext {
  app: INestApplication;
  connection: Connection;
}

export async function createE2EApp(): Promise<E2EAppContext> {
  process.env.NODE_ENV = 'test';
  process.env.APP_NAME = 'perdiem-management-system';
  process.env.APP_PORT = '3001';
  process.env.APP_URL = 'http://localhost:3001';
  process.env.CORS_ORIGINS = 'http://localhost:3002';
  process.env.MONGODB_URI = await startMongoMemoryServer();
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-characters!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-characters!';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.LOG_LEVEL = 'error';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const connection = moduleFixture.get<Connection>(getConnectionToken());

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

  return { app, connection };
}

export async function closeE2EApp(context?: E2EAppContext): Promise<void> {
  if (context?.connection) {
    await context.connection.close();
  }
  if (context?.app) {
    await context.app.close();
  }
  await stopMongoMemoryServer();
}
