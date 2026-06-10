import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { HttpContextParam } from '@/common/decorators/http-context.decorator';
import { HttpContext } from '@/common/interfaces/http-context.interface';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { Permission } from '@/common/enums/permission.enum';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { MarkPaymentDto } from './dto/mark-payment.dto';
import { PaymentService } from './payment.service';

@Controller('finance/payments')
export class FinanceController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @RequirePermissions(Permission.FINANCE_READ)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPaymentsQueryDto) {
    return this.paymentService.list(user, query);
  }

  @Get('export')
  @RequirePermissions(Permission.FINANCE_EXPORT)
  export(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPaymentsQueryDto) {
    return this.paymentService.exportCsv(user, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.FINANCE_READ)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') paymentId: string) {
    return this.paymentService.getById(user, paymentId);
  }

  @Post(':id/mark-paid')
  @RequirePermissions(Permission.FINANCE_PROCESS)
  markPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentId: string,
    @Body() dto: MarkPaymentDto,
    @HttpContextParam() httpContext: HttpContext,
  ) {
    return this.paymentService.markPaid(user, paymentId, dto, httpContext);
  }

  @Post(':id/mark-failed')
  @RequirePermissions(Permission.FINANCE_PROCESS)
  markFailed(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentId: string,
    @Body() dto: MarkPaymentDto,
    @HttpContextParam() httpContext: HttpContext,
  ) {
    return this.paymentService.markFailed(user, paymentId, dto, httpContext);
  }
}
