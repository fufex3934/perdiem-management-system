import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoliciesController } from './policies.controller';
import { PolicyCalculationService } from './policy-calculation.service';
import { PolicyRepository } from './policy.repository';
import { PolicyService } from './policy.service';
import { PerDiemPolicy, PerDiemPolicySchema } from './schemas/per-diem-policy.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PerDiemPolicy.name, schema: PerDiemPolicySchema },
    ]),
  ],
  controllers: [PoliciesController],
  providers: [PolicyRepository, PolicyService, PolicyCalculationService],
  exports: [PolicyService, PolicyCalculationService, PolicyRepository],
})
export class PoliciesModule {}
