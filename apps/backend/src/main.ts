import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { urlencoded } from 'express';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { AllConfig } from './infrastructure/config/configuration';
import { initSentry } from './infrastructure/observability/sentry';

initSentry();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<AllConfig, true>);
  const appConfig = configService.get('app', { infer: true });

  if (appConfig.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(helmet());
  app.use(urlencoded({ extended: false }));
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Tenant-Id',
    ],
  });

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
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableShutdownHooks();

  if (appConfig.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Per Diem Management API')
      .setDescription('Enterprise multi-tenant per diem management REST API')
      .setVersion(appConfig.version)
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-Id', in: 'header' }, 'tenant')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = appConfig.port;
  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(
    `Application "${appConfig.name}" running on ${appConfig.url} [${appConfig.nodeEnv}]`,
    'Bootstrap',
  );
}

bootstrap();
