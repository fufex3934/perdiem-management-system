import configuration from './configuration';
import { Environment } from './env.validation';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load configuration from environment variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_NAME = 'test-app';
    process.env.APP_PORT = '4000';
    process.env.APP_URL = 'http://localhost:4000';
    process.env.CORS_ORIGINS = 'http://localhost:3002,http://localhost:4000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
    process.env.LOG_LEVEL = 'warn';

    const config = configuration();

    expect(config.app.nodeEnv).toBe(Environment.Production);
    expect(config.app.name).toBe('test-app');
    expect(config.app.port).toBe(4000);
    expect(config.app.corsOrigins).toEqual([
      'http://localhost:3002',
      'http://localhost:4000',
    ]);
    expect(config.database.uri).toBe('mongodb://localhost:27017/test');
    expect(config.logging.level).toBe('warn');
  });

  it('should provide sensible defaults', () => {
    delete process.env.APP_PORT;
    delete process.env.LOG_LEVEL;

    const config = configuration();

    expect(config.app.port).toBe(3001);
    expect(config.logging.level).toBe('info');
  });
});
