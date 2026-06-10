import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { Permission } from '@/common/enums/permission.enum';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQueryDto) {
    return this.notificationService.list(user, query);
  }

  @Get('unread-count')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getUnreadCount(user);
  }

  @Post('mark-all-read')
  @RequirePermissions(Permission.NOTIFICATIONS_WRITE)
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.markAllRead(user);
  }

  @Patch(':id/read')
  @RequirePermissions(Permission.NOTIFICATIONS_WRITE)
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') notificationId: string) {
    return this.notificationService.markRead(user, notificationId);
  }
}
