import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoliciesController } from './policies.controller';
import { PolicyCalculationService } from './policy-calculation.service';
import { PolicyVersionRepository } from './policy-version.repository';
import { PolicyRepository } from './policy.repository';
import { PolicyService } from './policy.service';
import { PerDiemPolicy, PerDiemPolicySchema } from './schemas/per-diem-policy.schema';
import { PolicyVersion, PolicyVersionSchema } from './schemas/policy-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PerDiemPolicy.name, schema: PerDiemPolicySchema },
      { name: PolicyVersion.name, schema: PolicyVersionSchema },
    ]),
  ],
  controllers: [PoliciesController],
  providers: [
    PolicyRepository,
    PolicyVersionRepository,
    PolicyService,
    PolicyCalculationService,
  ],
  exports: [PolicyService, PolicyCalculationService, PolicyRepository],
})
export class PoliciesModule {}
