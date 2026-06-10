import { Environment } from './env.validation';

export interface AppConfig {
  nodeEnv: Environment;
  name: string;
  port: number;
  url: string;
  corsOrigins: string[];
}

export interface DatabaseConfig {
  uri: string;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface LoggingConfig {
  level: string;
}

export interface RateLimitConfig {
  ttlMs: number;
  max: number;
  authMax: number;
}

export interface AllConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  logging: LoggingConfig;
  rateLimit: RateLimitConfig;
}

export default (): AllConfig => ({
  app: {
    nodeEnv: (process.env.NODE_ENV as Environment) ?? Environment.Development,
    name: process.env.APP_NAME ?? 'perdiem-management-system',
    port: parseInt(process.env.APP_PORT ?? '3001', 10),
    url: process.env.APP_URL ?? 'http://localhost:3001',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3002')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  database: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/perdiem',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  rateLimit: {
    ttlMs: parseInt(process.env.RATE_LIMIT_TTL_MS ?? '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10', 10),
  },
});
