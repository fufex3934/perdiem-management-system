import {
  Body,
  Controller,
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
import { CreateTravelRequestDto } from './dto/create-travel-request.dto';
import { ListTravelRequestsQueryDto } from './dto/list-travel-requests-query.dto';
import { UpdateTravelRequestDto } from './dto/update-travel-request.dto';
import { TravelRequestService } from './travel-request.service';

@Controller('travel-requests')
export class TravelRequestsController {
  constructor(private readonly travelRequestService: TravelRequestService) {}

  @Post()
  @RequirePermissions(Permission.TRAVEL_REQUESTS_WRITE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTravelRequestDto) {
    return this.travelRequestService.create(user, dto);
  }

  @Get()
  @RequirePermissions(Permission.TRAVEL_REQUESTS_READ)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTravelRequestsQueryDto) {
    return this.travelRequestService.list(user, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.TRAVEL_REQUESTS_READ)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') requestId: string) {
    return this.travelRequestService.getById(user, requestId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TRAVEL_REQUESTS_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
    @Body() dto: UpdateTravelRequestDto,
  ) {
    return this.travelRequestService.update(user, requestId, dto);
  }

  @Post(':id/submit')
  @RequirePermissions(Permission.TRAVEL_REQUESTS_SUBMIT)
  submit(@CurrentUser() user: AuthenticatedUser, @Param('id') requestId: string) {
    return this.travelRequestService.submit(user, requestId);
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.TRAVEL_REQUESTS_CANCEL)
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') requestId: string) {
    return this.travelRequestService.cancel(user, requestId);
  }
}
