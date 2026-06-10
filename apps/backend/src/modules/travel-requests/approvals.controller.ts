import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { Permission } from '@/common/enums/permission.enum';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { ApprovalService } from './approval.service';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { ListPendingApprovalsQueryDto } from './dto/list-pending-approvals-query.dto';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('pending')
  @RequirePermissions(Permission.APPROVALS_READ)
  listPending(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPendingApprovalsQueryDto,
  ) {
    return this.approvalService.listPending(user, query);
  }

  @Get('travel-requests/:id/audit-trail')
  @RequirePermissions(Permission.TRAVEL_REQUESTS_READ)
  getAuditTrail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
  ) {
    return this.approvalService.getAuditTrail(user, requestId);
  }

  @Post('travel-requests/:id/approve')
  @RequirePermissions(Permission.APPROVALS_APPROVE)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvalService.approve(user, requestId, dto);
  }

  @Post('travel-requests/:id/reject')
  @RequirePermissions(Permission.APPROVALS_REJECT)
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvalService.reject(user, requestId, dto);
  }
}
