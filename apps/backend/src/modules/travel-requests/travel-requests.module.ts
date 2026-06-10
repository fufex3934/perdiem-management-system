import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PoliciesModule } from '../policies/policies.module';
import { ApprovalAuditRepository } from './approval-audit.repository';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalService } from './approval.service';
import { ApprovalsController } from './approvals.controller';
import {
  ApprovalAuditLog,
  ApprovalAuditLogSchema,
} from './schemas/approval-audit-log.schema';
import { TravelRequest, TravelRequestSchema } from './schemas/travel-request.schema';
import { TravelRequestRepository } from './travel-request.repository';
import { TravelRequestService } from './travel-request.service';
import { TravelRequestsController } from './travel-requests.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TravelRequest.name, schema: TravelRequestSchema },
      { name: ApprovalAuditLog.name, schema: ApprovalAuditLogSchema },
    ]),
    PoliciesModule,
    forwardRef(() => FinanceModule),
    NotificationsModule,
  ],
  controllers: [TravelRequestsController, ApprovalsController],
  providers: [
    TravelRequestRepository,
    ApprovalAuditRepository,
    ApprovalWorkflowService,
    ApprovalService,
    TravelRequestService,
  ],
  exports: [TravelRequestService, TravelRequestRepository, ApprovalService],
})
export class TravelRequestsModule {}
