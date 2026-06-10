import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { Permission } from '@/common/enums/permission.enum';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { CalculatePerDiemDto } from './dto/calculate-per-diem.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { ListPoliciesQueryDto } from './dto/list-policies-query.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyCalculationService } from './policy-calculation.service';
import { PolicyService } from './policy.service';

@Controller('policies')
export class PoliciesController {
  constructor(
    private readonly policyService: PolicyService,
    private readonly policyCalculationService: PolicyCalculationService,
  ) {}

  @Post('calculate')
  @RequirePermissions(Permission.POLICIES_CALCULATE)
  calculate(@CurrentUser() user: AuthenticatedUser, @Body() dto: CalculatePerDiemDto) {
    return this.policyCalculationService.calculate(user.tenantId, dto);
  }

  @Post()
  @RequirePermissions(Permission.POLICIES_WRITE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePolicyDto) {
    return this.policyService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions(Permission.POLICIES_READ)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPoliciesQueryDto) {
    return this.policyService.list(user.tenantId, query);
  }

  @Get(':policyId/versions')
  @RequirePermissions(Permission.POLICIES_READ)
  listVersions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('policyId') policyId: string,
  ) {
    return this.policyService.listVersions(user.tenantId, policyId);
  }

  @Get(':id')
  @RequirePermissions(Permission.POLICIES_READ)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') policyId: string) {
    return this.policyService.getById(user.tenantId, policyId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.POLICIES_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') policyId: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.policyService.update(user.tenantId, policyId, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(Permission.POLICIES_DELETE)
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') policyId: string) {
    return this.policyService.delete(user.tenantId, policyId);
  }
}
