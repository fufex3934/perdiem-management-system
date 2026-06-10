import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes } from '@/common/constants/error-codes';
import { UserRole } from '@/common/enums/user-role.enum';
import { UserStatus } from '@/common/enums/user-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { RefreshTokenRepository } from '../auth/refresh-token.repository';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import {
  PaginatedUsersResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from './schemas/user.schema';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Injectable()
export class UserManagementService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async listUsers(
    tenantId: string,
    query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.userRepository.findAllInTenant(
      tenantId,
      { status: query.status, role: query.role },
      page,
      limit,
    );

    return {
      items: items.map((user) => UserResponseDto.fromDocument(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUser(tenantId: string, userId: string): Promise<UserResponseDto> {
    const user = await this.userService.getProfile(tenantId, userId);
    return UserResponseDto.fromDocument(user);
  }

  async updateUser(
    tenantId: string,
    userId: string,
    actor: AuthenticatedUser,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.getProfile(tenantId, userId);

    if (dto.role !== undefined) {
      this.ensureCanAssignRole(actor.role, dto.role);
      await this.ensureNotLastAdmin(tenantId, user, dto.role, dto.status);
    }

    if (dto.status === UserStatus.INACTIVE) {
      await this.ensureNotLastAdmin(tenantId, user, user.role, dto.status);
    }

    if (actor.userId === userId && (dto.role !== undefined || dto.status !== undefined)) {
      throw new BusinessException(
        {
          code: ErrorCodes.CANNOT_MODIFY_SELF,
          message: 'You cannot change your own role or status',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const updated = await this.userRepository.updateInTenant(tenantId, userId, dto);

    if (!updated) {
      throw new BusinessException(
        {
          code: ErrorCodes.USER_NOT_FOUND,
          message: 'User not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.role !== undefined && dto.role !== user.role) {
      await this.refreshTokenRepository.revokeAllForUser(tenantId, userId);
    }

    return UserResponseDto.fromDocument(updated);
  }

  async deleteUser(
    tenantId: string,
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    if (actor.userId === userId) {
      throw new BusinessException(
        {
          code: ErrorCodes.CANNOT_MODIFY_SELF,
          message: 'You cannot delete your own account',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const user = await this.userService.getProfile(tenantId, userId);
    await this.ensureNotLastAdmin(tenantId, user, UserRole.EMPLOYEE, UserStatus.INACTIVE);

    const deleted = await this.userRepository.softDeleteInTenant(tenantId, userId);

    if (!deleted) {
      throw new BusinessException(
        {
          code: ErrorCodes.USER_NOT_FOUND,
          message: 'User not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.refreshTokenRepository.revokeAllForUser(tenantId, userId);

    return { message: 'User deleted successfully' };
  }

  ensureCanAssignRole(actorRole: UserRole, targetRole: UserRole): void {
    if (actorRole === UserRole.TENANT_ADMIN) {
      return;
    }

    if (actorRole === UserRole.MANAGER) {
      if ([UserRole.EMPLOYEE, UserRole.MANAGER].includes(targetRole)) {
        return;
      }
    }

    throw new BusinessException(
      {
        code: ErrorCodes.INVALID_ROLE_ASSIGNMENT,
        message: 'You are not allowed to assign this role',
        details: { targetRole },
      },
      HttpStatus.FORBIDDEN,
    );
  }

  private async ensureNotLastAdmin(
    tenantId: string,
    user: UserDocument,
    nextRole?: UserRole,
    nextStatus?: UserStatus,
  ): Promise<void> {
    if (user.role !== UserRole.TENANT_ADMIN) {
      return;
    }

    const demotingAdmin =
      (nextRole !== undefined && nextRole !== UserRole.TENANT_ADMIN) ||
      nextStatus === UserStatus.INACTIVE;

    if (!demotingAdmin) {
      return;
    }

    const adminCount = await this.userRepository.countByRoleInTenant(
      tenantId,
      UserRole.TENANT_ADMIN,
    );

    if (adminCount <= 1) {
      throw new BusinessException(
        {
          code: ErrorCodes.LAST_ADMIN_PROTECTED,
          message: 'Cannot remove or demote the last tenant admin',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
