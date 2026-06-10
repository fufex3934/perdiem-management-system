import { validate, Environment } from './env.validation';

describe('Environment Validation', () => {
  const validEnv = {
    NODE_ENV: 'development',
    APP_NAME: 'perdiem-management-system',
    APP_PORT: '3001',
    APP_URL: 'http://localhost:3001',
    CORS_ORIGINS: 'http://localhost:3002',
    MONGODB_URI: 'mongodb://localhost:27017/perdiem',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    LOG_LEVEL: 'debug',
  };

  it('should validate a correct environment configuration', () => {
    const result = validate(validEnv);

    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.APP_NAME).toBe('perdiem-management-system');
    expect(result.APP_PORT).toBe(3001);
  });

  it('should reject missing required fields', () => {
    const { APP_NAME, ...incomplete } = validEnv;

    expect(() => validate(incomplete)).toThrow('Environment validation failed');
  });

  it('should reject JWT secrets shorter than 32 characters', () => {
    expect(() =>
      validate({
        ...validEnv,
        JWT_ACCESS_SECRET: 'short',
      }),
    ).toThrow('Environment validation failed');
  });

  it('should reject invalid NODE_ENV values', () => {
    expect(() =>
      validate({
        ...validEnv,
        NODE_ENV: 'invalid',
      }),
    ).toThrow('Environment validation failed');
  });

  it('should reject invalid APP_PORT values', () => {
    expect(() =>
      validate({
        ...validEnv,
        APP_PORT: '0',
      }),
    ).toThrow('Environment validation failed');
  });
});
