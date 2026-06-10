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
import { CreateInviteDto } from './dto/create-invite.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteService } from './invite.service';
import { UserManagementService } from './user-management.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly userManagementService: UserManagementService,
    private readonly inviteService: InviteService,
  ) {}

  @Get()
  @RequirePermissions(Permission.USERS_READ)
  listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.userManagementService.listUsers(user.tenantId, query);
  }

  @Get('invites')
  @RequirePermissions(Permission.USERS_INVITE)
  listInvites(@CurrentUser() user: AuthenticatedUser) {
    return this.inviteService.listInvites(user.tenantId);
  }

  @Post('invites')
  @RequirePermissions(Permission.USERS_INVITE)
  createInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInviteDto,
  ) {
    return this.inviteService.createInvite(user, dto);
  }

  @Delete('invites/:id')
  @RequirePermissions(Permission.USERS_INVITE)
  revokeInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') inviteId: string,
  ) {
    return this.inviteService.revokeInvite(user.tenantId, inviteId, user);
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_READ)
  getUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.userManagementService.getUser(user.tenantId, userId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USERS_WRITE)
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userManagementService.updateUser(user.tenantId, userId, user, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USERS_DELETE)
  deleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.userManagementService.deleteUser(user.tenantId, userId, user);
  }
}
