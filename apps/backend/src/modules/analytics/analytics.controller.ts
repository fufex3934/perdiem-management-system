import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { Permission } from '@/common/enums/permission.enum';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDateRangeQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions(Permission.ANALYTICS_READ_OWN)
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getDashboard(user);
  }

  @Get('reports/spend')
  @RequirePermissions(Permission.ANALYTICS_READ_OWN)
  getSpendReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.getSpendReport(user, query);
  }

  @Get('reports/spend/export')
  @RequirePermissions(Permission.ANALYTICS_EXPORT)
  exportSpendReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.analyticsService.exportSpendReport(user, query);
  }
}
