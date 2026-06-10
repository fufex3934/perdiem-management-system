import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from '@/infrastructure/config/configuration';
import { EventBusService } from '@/modules/notifications/event-bus.service';

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
  operational: {
    redisConfigured: boolean;
    domainEventsAsync: boolean;
    googleOAuthEnabled: boolean;
    microsoftOAuthEnabled: boolean;
    samlEnabled: boolean;
    sentryEnabled: boolean;
  };
  timestamp: string;
}

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private requestsTotal = 0;
  private errorsTotal = 0;

  constructor(
    private readonly configService: ConfigService<AllConfig, true>,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  recordRequest(): void {
    this.requestsTotal += 1;
  }

  recordError(): void {
    this.errorsTotal += 1;
  }

  getMetrics(): ApplicationMetrics {
    const appConfig = this.configService.get('app', { infer: true });
    const redisConfig = this.configService.get('redis', { infer: true });
    const googleOAuth = this.configService.get('googleOAuth', { infer: true });
    const microsoftOAuth = this.configService.get('microsoftOAuth', { infer: true });
    const saml = this.configService.get('saml', { infer: true });
    const observability = this.configService.get('observability', { infer: true });
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
      operational: {
        redisConfigured: redisConfig.enabled,
        domainEventsAsync: this.eventBusService?.isAsyncMode() ?? false,
        googleOAuthEnabled: Boolean(googleOAuth.enabled && googleOAuth.clientId),
        microsoftOAuthEnabled: Boolean(microsoftOAuth.enabled && microsoftOAuth.clientId),
        samlEnabled: Boolean(saml.enabled && saml.entryPoint && saml.idpCert),
        sentryEnabled: observability.sentryEnabled,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
