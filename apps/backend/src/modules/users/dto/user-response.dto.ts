import { UserRole } from '@/common/enums/user-role.enum';
import { UserStatus } from '@/common/enums/user-status.enum';
import { UserDocument } from '../schemas/user.schema';

export class UserResponseDto {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  invitedBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromDocument(user: UserDocument): UserResponseDto {
    return {
      id: user._id.toString(),
      tenantId: user.tenantId.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      invitedBy: user.invitedBy?.toString() ?? null,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt ?? new Date(),
    };
  }
}

export class PaginatedUsersResponseDto {
  items: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
