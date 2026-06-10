import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { TravelRequestsModule } from '../travel-requests/travel-requests.module';
import { FinanceController } from './finance.controller';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { PerDiemPayment, PerDiemPaymentSchema } from './schemas/per-diem-payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PerDiemPayment.name, schema: PerDiemPaymentSchema },
    ]),
    forwardRef(() => TravelRequestsModule),
    NotificationsModule,
  ],
  controllers: [FinanceController],
  providers: [PaymentRepository, PaymentService],
  exports: [PaymentService],
})
export class FinanceModule {}
