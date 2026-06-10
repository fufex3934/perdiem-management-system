import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PerDiemPayment, PerDiemPaymentSchema } from '../finance/schemas/per-diem-payment.schema';
import { TravelRequest, TravelRequestSchema } from '../travel-requests/schemas/travel-request.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TravelRequest.name, schema: TravelRequestSchema },
      { name: PerDiemPayment.name, schema: PerDiemPaymentSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsRepository, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
