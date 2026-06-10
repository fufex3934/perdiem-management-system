import { ConfigService } from '@nestjs/config';
import { AllConfig } from '@/infrastructure/config/configuration';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue({
        name: 'perdiem-management-system',
        version: '1.0.0',
        nodeEnv: 'test',
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
