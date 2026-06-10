import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { Permission } from '@/common/enums/permission.enum';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { ListSecurityAuditQueryDto } from './dto/list-security-audit-query.dto';
import { SecurityAuditService } from './security-audit.service';

@Controller('security/audit-logs')
export class SecurityAuditController {
  constructor(private readonly securityAuditService: SecurityAuditService) {}

  @Get()
  @RequirePermissions(Permission.SECURITY_AUDIT_READ)
  listAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSecurityAuditQueryDto,
  ) {
    return this.securityAuditService.listAuditLogs(user.tenantId, query);
  }
}
