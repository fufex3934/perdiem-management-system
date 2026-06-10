import { createHash, randomUUID } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { ErrorCodes } from '@/common/constants/error-codes';
import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { HttpContext } from '@/common/interfaces/http-context.interface';
import { UserStatus } from '@/common/enums/user-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { AllConfig } from '@/infrastructure/config/configuration';
import { CreateInviteDto } from './dto/create-invite.dto';
import {
  CreateInviteResponseDto,
  InviteResponseDto,
} from './dto/invite-response.dto';
import { InviteRepository } from './invite.repository';
import { InviteDocument } from './schemas/invite.schema';
import { UserRepository } from './user.repository';
import { SecurityAuditService } from '../security/security-audit.service';
import { UserManagementService } from './user-management.service';

const INVITE_EXPIRY_DAYS = 7;

@Injectable()
export class InviteService {
  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly userRepository: UserRepository,
    private readonly userManagementService: UserManagementService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly configService: ConfigService<AllConfig, true>,
  ) {}

  async createInvite(
    actor: AuthenticatedUser,
    dto: CreateInviteDto,
    httpContext?: HttpContext,
  ): Promise<CreateInviteResponseDto> {
    const tenantId = actor.tenantId;
    const role = dto.role ?? UserRole.EMPLOYEE;

    this.userManagementService.ensureCanAssignRole(actor.role, role);

    if (await this.userRepository.existsByEmailInTenant(tenantId, dto.email)) {
      throw new BusinessException(
        {
          code: ErrorCodes.EMAIL_EXISTS,
          message: 'A user with this email already exists in the tenant',
        },
        HttpStatus.CONFLICT,
      );
    }

    const pendingInvite = await this.inviteRepository.findPendingByEmailInTenant(
      tenantId,
      dto.email,
    );

    if (pendingInvite) {
      throw new BusinessException(
        {
          code: ErrorCodes.EMAIL_EXISTS,
          message: 'A pending invite already exists for this email',
        },
        HttpStatus.CONFLICT,
      );
    }

    const placeholderPassword = await bcrypt.hash(randomUUID(), 10);
    const user = await this.userRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      email: dto.email.toLowerCase(),
      password: placeholderPassword,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role,
      status: UserStatus.PENDING,
      invitedBy: new Types.ObjectId(actor.userId),
    });

    const rawToken = randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invite = await this.inviteRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      email: dto.email.toLowerCase(),
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role,
      invitedBy: new Types.ObjectId(actor.userId),
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const corsOrigin = this.configService.get('app.corsOrigins', { infer: true })[0];

    this.securityAuditService.record({
      tenantId,
      userId: actor.userId,
      actorEmail: actor.email,
      action: SecurityAuditAction.USER_INVITE_CREATED,
      resourceType: 'invite',
      resourceId: invite._id.toString(),
      success: true,
      metadata: { email: dto.email, role },
      httpContext,
    });

    return {
      invite: this.mapInvite(invite),
      inviteToken: rawToken,
      acceptUrl: `${corsOrigin}/invite/accept?token=${rawToken}`,
    };
  }

  async listInvites(tenantId: string): Promise<InviteResponseDto[]> {
    const invites = await this.inviteRepository.findAllPendingInTenant(tenantId);
    return invites.map((invite) => this.mapInvite(invite));
  }

  async revokeInvite(
    tenantId: string,
    inviteId: string,
    actor: AuthenticatedUser,
    httpContext?: HttpContext,
  ): Promise<{ message: string }> {
    const invite = await this.inviteRepository.findByIdInTenant(tenantId, inviteId);

    if (!invite) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVITE_NOT_FOUND,
          message: 'Invite not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const revoked = await this.inviteRepository.revoke(inviteId, tenantId);

    if (!revoked) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVITE_NOT_FOUND,
          message: 'Invite not found or already processed',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.userRepository.softDeleteInTenant(tenantId, invite.userId.toString());

    this.securityAuditService.record({
      tenantId,
      userId: actor.userId,
      actorEmail: actor.email,
      action: SecurityAuditAction.USER_INVITE_REVOKED,
      resourceType: 'invite',
      resourceId: inviteId,
      success: true,
      httpContext,
    });

    return { message: 'Invite revoked successfully' };
  }

  async acceptInvite(token: string, password: string) {
    const tokenHash = this.hashToken(token);
    const invite = await this.inviteRepository.findValidByTokenHash(tokenHash);

    if (!invite) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVITE_NOT_FOUND,
          message: 'Invalid or expired invite token',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const user = await this.userRepository.findByIdInTenant(
      invite.tenantId.toString(),
      invite.userId.toString(),
    );

    if (!user || user.status !== UserStatus.PENDING) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVITE_ALREADY_ACCEPTED,
          message: 'Invite has already been accepted',
        },
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.userRepository.updateInTenant(
      invite.tenantId.toString(),
      invite.userId.toString(),
      {
        password: hashedPassword,
        status: UserStatus.ACTIVE,
      },
    );

    await this.inviteRepository.markAccepted(invite._id.toString());

    return {
      message: 'Invite accepted successfully. You can now sign in.',
      tenantId: invite.tenantId.toString(),
      email: invite.email,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private mapInvite(invite: InviteDocument): InviteResponseDto {
    return {
      id: invite._id.toString(),
      tenantId: invite.tenantId.toString(),
      email: invite.email,
      firstName: invite.firstName,
      lastName: invite.lastName,
      role: invite.role,
      invitedBy: invite.invitedBy.toString(),
      userId: invite.userId.toString(),
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      isRevoked: invite.isRevoked,
      createdAt: invite.createdAt ?? new Date(),
    };
  }
}
