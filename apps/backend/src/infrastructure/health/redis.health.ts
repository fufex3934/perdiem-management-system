import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';
import { AllConfig } from '../config/configuration';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService<AllConfig, true>) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const redisConfig = this.configService.get('redis', { infer: true });

    if (!redisConfig.enabled || !redisConfig.url) {
      return this.getStatus(key, true, { mode: 'disabled' });
    }

    const client = new Redis(redisConfig.url, {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      return this.getStatus(key, pong === 'PONG', { mode: 'connected' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redis unreachable';
      return this.getStatus(key, false, { mode: 'error', message });
    } finally {
      client.disconnect();
    }
  }
}
