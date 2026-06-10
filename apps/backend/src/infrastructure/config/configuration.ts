import { Environment } from './env.validation';

export interface AppConfig {
  nodeEnv: Environment;
  name: string;
  version: string;
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

export interface EmailConfig {
  provider: 'console' | 'smtp';
  from: string;
  smtp?: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    secure: boolean;
  };
}

export interface RedisConfig {
  enabled: boolean;
  url?: string;
}

export interface GoogleOAuthConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  callbackUrl: string;
}

export interface MicrosoftOAuthConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  callbackUrl: string;
  directoryTenantId: string;
}

export interface SamlConfig {
  enabled: boolean;
  entryPoint?: string;
  issuer?: string;
  idpCert?: string;
  callbackUrl: string;
}

export interface ObservabilityConfig {
  sentryEnabled: boolean;
  sentryDsn?: string;
}

export interface AllConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  logging: LoggingConfig;
  rateLimit: RateLimitConfig;
  email: EmailConfig;
  redis: RedisConfig;
  googleOAuth: GoogleOAuthConfig;
  microsoftOAuth: MicrosoftOAuthConfig;
  saml: SamlConfig;
  observability: ObservabilityConfig;
}

export default (): AllConfig => ({
  app: {
    nodeEnv: (process.env.NODE_ENV as Environment) ?? Environment.Development,
    name: process.env.APP_NAME ?? 'perdiem-management-system',
    version: process.env.APP_VERSION ?? '1.0.0',
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
  email: {
    provider: (process.env.EMAIL_PROVIDER === 'smtp' ? 'smtp' : 'console') as
      | 'console'
      | 'smtp',
    from: process.env.EMAIL_FROM ?? 'noreply@perdiem.local',
    smtp:
      process.env.SMTP_HOST && process.env.SMTP_HOST.length > 0
        ? {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT ?? '587', 10),
            user: process.env.SMTP_USER || undefined,
            pass: process.env.SMTP_PASS || undefined,
            secure: process.env.SMTP_SECURE === 'true',
          }
        : undefined,
  },
  redis: {
    enabled: Boolean(process.env.REDIS_URL?.trim()),
    url: process.env.REDIS_URL?.trim() || undefined,
  },
  googleOAuth: {
    enabled: process.env.GOOGLE_OAUTH_ENABLED === 'true',
    clientId: process.env.GOOGLE_CLIENT_ID || undefined,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:3001/api/v1/auth/google/callback',
  },
  microsoftOAuth: {
    enabled: process.env.MICROSOFT_OAUTH_ENABLED === 'true',
    clientId: process.env.MICROSOFT_CLIENT_ID || undefined,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || undefined,
    callbackUrl:
      process.env.MICROSOFT_CALLBACK_URL ??
      'http://localhost:3001/api/v1/auth/microsoft/callback',
    directoryTenantId: process.env.MICROSOFT_DIRECTORY_TENANT_ID ?? 'common',
  },
  saml: {
    enabled: process.env.SAML_ENABLED === 'true',
    entryPoint: process.env.SAML_ENTRY_POINT || undefined,
    issuer: process.env.SAML_ISSUER || undefined,
    idpCert: process.env.SAML_IDP_CERT?.replace(/\\n/g, '\n') || undefined,
    callbackUrl:
      process.env.SAML_CALLBACK_URL ??
      'http://localhost:3001/api/v1/auth/saml/callback',
  },
  observability: {
    sentryEnabled: Boolean(process.env.SENTRY_DSN?.trim()),
    sentryDsn: process.env.SENTRY_DSN?.trim() || undefined,
  },
});
