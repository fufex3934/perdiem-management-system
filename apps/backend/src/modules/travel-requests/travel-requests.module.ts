import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoliciesModule } from '../policies/policies.module';
import { TravelRequest, TravelRequestSchema } from './schemas/travel-request.schema';
import { TravelRequestRepository } from './travel-request.repository';
import { TravelRequestService } from './travel-request.service';
import { TravelRequestsController } from './travel-requests.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TravelRequest.name, schema: TravelRequestSchema },
    ]),
    PoliciesModule,
  ],
  controllers: [TravelRequestsController],
  providers: [TravelRequestRepository, TravelRequestService],
  exports: [TravelRequestService, TravelRequestRepository],
})
export class TravelRequestsModule {}
