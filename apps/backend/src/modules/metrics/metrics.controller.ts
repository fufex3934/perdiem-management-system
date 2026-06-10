import { Controller, Get } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { SkipRateLimit } from '@/common/decorators/rate-limit.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@Public()
@SkipRateLimit()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics() {
    return this.metricsService.getMetrics();
  }
}
