import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from '@/infrastructure/config/configuration';

export interface ApplicationMetrics {
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  requestsTotal: number;
  errorsTotal: number;
  memory: {
    heapUsedBytes: number;
    heapTotalBytes: number;
    rssBytes: number;
  };
  timestamp: string;
}

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private requestsTotal = 0;
  private errorsTotal = 0;

  constructor(private readonly configService: ConfigService<AllConfig, true>) {}

  recordRequest(): void {
    this.requestsTotal += 1;
  }

  recordError(): void {
    this.errorsTotal += 1;
  }

  getMetrics(): ApplicationMetrics {
    const appConfig = this.configService.get('app', { infer: true });
    const memory = process.memoryUsage();

    return {
      service: appConfig.name,
      version: appConfig.version,
      environment: appConfig.nodeEnv,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      requestsTotal: this.requestsTotal,
      errorsTotal: this.errorsTotal,
      memory: {
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        rssBytes: memory.rss,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
