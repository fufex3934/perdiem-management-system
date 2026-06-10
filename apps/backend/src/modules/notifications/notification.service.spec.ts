import { Types } from 'mongoose';
import { NotificationType } from '@/common/enums/notification-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NotificationDocument } from './schemas/notification.schema';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: jest.Mocked<NotificationRepository>;

  const tenantId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';
  const notificationId = '507f1f77bcf86cd799439014';

  const actor = {
    userId,
    tenantId,
    email: 'user@example.com',
    role: UserRole.EMPLOYEE,
  };

  const baseNotification = (overrides: Partial<NotificationDocument> = {}) =>
    ({
      _id: new Types.ObjectId(notificationId),
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      type: NotificationType.TRAVEL_APPROVED,
      title: 'Approved',
      message: 'Your trip was approved',
      entityType: 'travel_request',
      entityId: new Types.ObjectId('507f1f77bcf86cd799439015'),
      readAt: null,
      createdAt: new Date(),
      ...overrides,
    }) as NotificationDocument;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      createMany: jest.fn(),
      findByIdForUser: jest.fn(),
      findAllForUser: jest.fn(),
      countUnreadForUser: jest.fn(),
      markReadForUser: jest.fn(),
      markAllReadForUser: jest.fn(),
    } as unknown as jest.Mocked<NotificationRepository>;

    service = new NotificationService(repository);
  });

  it('should list notifications for current user', async () => {
    repository.findAllForUser.mockResolvedValue({
      items: [baseNotification()],
      total: 1,
    });

    const result = await service.list(actor, {});

    expect(result.items).toHaveLength(1);
    expect(repository.findAllForUser).toHaveBeenCalledWith(tenantId, userId, {}, 1, 20);
  });

  it('should return unread count', async () => {
    repository.countUnreadForUser.mockResolvedValue(3);

    const result = await service.getUnreadCount(actor);

    expect(result.count).toBe(3);
  });

  it('should mark notification as read', async () => {
    repository.markReadForUser.mockResolvedValue(
      baseNotification({ readAt: new Date('2026-06-10') }),
    );

    const result = await service.markRead(actor, notificationId);

    expect(result.readAt).toBeTruthy();
  });

  it('should notify multiple users', async () => {
    repository.createMany.mockResolvedValue([]);

    await service.notifyUsers({
      tenantId,
      userIds: [userId, '507f1f77bcf86cd799439099'],
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required',
      message: 'Please review',
      entityType: 'travel_request',
      entityId: '507f1f77bcf86cd799439015',
    });

    expect(repository.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: NotificationType.APPROVAL_REQUIRED }),
      ]),
    );
  });
});
