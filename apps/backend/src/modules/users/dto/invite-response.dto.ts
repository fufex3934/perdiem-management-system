import { UserRole } from '@/common/enums/user-role.enum';
import { InviteDocument } from '../schemas/invite.schema';

export class InviteResponseDto {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  invitedBy: string;
  userId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  isRevoked: boolean;
  createdAt: Date;
}

export class CreateInviteResponseDto {
  invite: InviteResponseDto;
  inviteToken: string;
  acceptUrl: string;
  emailSent: boolean;
}
