import { ConfigService } from '@nestjs/config';
import { AllConfig } from '@/infrastructure/config/configuration';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'app') {
          return { name: 'perdiem-management-system', version: '1.0.0', nodeEnv: 'test' };
        }
        if (key === 'redis') return { enabled: false };
        if (key === 'googleOAuth') return { enabled: false };
        if (key === 'microsoftOAuth') return { enabled: false };
        if (key === 'saml') return { enabled: false };
        if (key === 'observability') return { sentryEnabled: false };
        return {};
      }),
    } as unknown as ConfigService<AllConfig, true>;

    service = new MetricsService(configService);
  });

  it('tracks requests and errors', () => {
    service.recordRequest();
    service.recordRequest();
    service.recordError();

    const metrics = service.getMetrics();

    expect(metrics.requestsTotal).toBe(2);
    expect(metrics.errorsTotal).toBe(1);
    expect(metrics.service).toBe('perdiem-management-system');
    expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
