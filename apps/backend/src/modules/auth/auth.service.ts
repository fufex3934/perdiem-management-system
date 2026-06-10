import { randomUUID } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ErrorCodes } from '@/common/constants/error-codes';
import { BusinessException } from '@/common/exceptions/business.exception';
import { getPermissionsForRole } from '@/common/rbac/role-permissions';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { AllConfig } from '@/infrastructure/config/configuration';
import { TenantService } from '../tenant/tenant.service';
import { UserDocument } from '../users/schemas/user.schema';
import { UserService } from '../users/user.service';
import {
  AuthResponseDto,
  AuthUserDto,
  TokenRefreshResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly userService: UserService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfig, true>,
  ) {}

  async registerTenant(dto: RegisterTenantDto): Promise<AuthResponseDto> {
    const slug =
      dto.slug ?? this.tenantService.generateSlugFromName(dto.tenantName);

    const tenant = await this.tenantService.createTenant(dto.tenantName, slug);

    const user = await this.userService.createAdminUser({
      tenantId: tenant._id,
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return this.buildAuthResponse(user, tenant._id.toString(), tenant.slug);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const tenant = await this.tenantService.getBySlug(dto.tenantSlug);
    const user = await this.userService.validateCredentials(
      tenant._id.toString(),
      dto.email,
      dto.password,
    );

    return this.buildAuthResponse(user, tenant._id.toString(), tenant.slug);
  }

  async refreshTokens(refreshToken: string): Promise<TokenRefreshResponseDto> {
    const jwtConfig = this.configService.get('jwt', { infer: true });

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtConfig.refreshSecret,
      });
    } catch {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_REFRESH_TOKEN,
          message: 'Invalid or expired refresh token',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (payload.type !== 'refresh') {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_REFRESH_TOKEN,
          message: 'Invalid refresh token',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const storedTokens = await this.refreshTokenRepository.findValidByUser(
      payload.tenantId,
      payload.sub,
    );

    const matchingToken = await this.findMatchingRefreshToken(
      refreshToken,
      storedTokens.map((t) => ({ id: t._id.toString(), hash: t.tokenHash })),
    );

    if (!matchingToken) {
      await this.refreshTokenRepository.revokeAllForUser(
        payload.tenantId,
        payload.sub,
      );
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_REFRESH_TOKEN,
          message: 'Refresh token has been revoked',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.refreshTokenRepository.revokeById(matchingToken);

    const user = await this.userService.getProfile(payload.tenantId, payload.sub);
    const tokens = await this.generateTokens(user);

    return tokens;
  }

  async logout(tenantId: string, userId: string): Promise<{ message: string }> {
    await this.refreshTokenRepository.revokeAllForUser(tenantId, userId);
    return { message: 'Logged out successfully' };
  }

  async getProfile(tenantId: string, userId: string): Promise<AuthUserDto> {
    const user = await this.userService.getProfile(tenantId, userId);
    return this.mapUserToDto(user);
  }

  async buildAuthResponseForUser(
    user: UserDocument,
    tenantId: string,
  ): Promise<AuthResponseDto> {
    return this.buildAuthResponse(user, tenantId, '');
  }

  private async buildAuthResponse(
    user: UserDocument,
    tenantId: string,
    _tenantSlug: string,
  ): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);

    return {
      user: this.mapUserToDto(user, tenantId),
      tokens,
    };
  }

  private async generateTokens(user: UserDocument) {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    const tenantId = user.tenantId.toString();

    const basePayload = {
      sub: user._id.toString(),
      tenantId,
      email: user.email,
      role: user.role,
    };

    const expiresIn = jwtConfig.accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`;
    const refreshExpiresIn = jwtConfig.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`;

    const accessToken = await this.jwtService.signAsync(
      { ...basePayload, type: 'access' as const },
      {
        secret: jwtConfig.accessSecret,
        expiresIn,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...basePayload, type: 'refresh' as const, jti: randomUUID() },
      {
        secret: jwtConfig.refreshSecret,
        expiresIn: refreshExpiresIn,
      },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = this.calculateExpiryDate(jwtConfig.refreshExpiresIn);

    await this.refreshTokenRepository.create({
      tenantId: user.tenantId,
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: jwtConfig.accessExpiresIn,
    };
  }

  private mapUserToDto(user: UserDocument, tenantId?: string): AuthUserDto {
    return {
      id: user._id.toString(),
      tenantId: tenantId ?? user.tenantId.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
    };
  }

  private async findMatchingRefreshToken(
    rawToken: string,
    stored: { id: string; hash: string }[],
  ): Promise<string | null> {
    for (const token of stored) {
      const matches = await bcrypt.compare(rawToken, token.hash);
      if (matches) {
        return token.id;
      }
    }
    return null;
  }

  private calculateExpiryDate(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}
