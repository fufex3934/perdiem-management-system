import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCodes } from '@/common/constants/error-codes';
import { UserStatus } from '@/common/enums/user-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AllConfig } from '@/infrastructure/config/configuration';
import { TenantService } from '../tenant/tenant.service';
import { UserRepository } from '../users/user.repository';
import { AuthService } from './auth.service';

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
}

interface OAuthState {
  tenantSlug: string;
}

@Injectable()
export class GoogleOAuthService {
  constructor(
    private readonly configService: ConfigService<AllConfig, true>,
    private readonly tenantService: TenantService,
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  isEnabled(): boolean {
    const config = this.configService.get('googleOAuth', { infer: true });
    return Boolean(config.enabled && config.clientId && config.clientSecret);
  }

  getAuthorizationUrl(tenantSlug: string): string {
    this.ensureEnabled();
    const config = this.configService.get('googleOAuth', { infer: true });
    const state = Buffer.from(JSON.stringify({ tenantSlug } satisfies OAuthState)).toString(
      'base64url',
    );

    const params = new URLSearchParams({
      client_id: config.clientId!,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state: string) {
    this.ensureEnabled();
    const { tenantSlug } = this.parseState(state);
    const tenant = await this.tenantService.getBySlug(tenantSlug);
    const googleUser = await this.fetchGoogleUser(code);

    if (!googleUser.email_verified) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Google account email is not verified',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userRepository.findByEmailInTenant(
      tenant._id.toString(),
      googleUser.email,
    );

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BusinessException(
        {
          code: ErrorCodes.OAUTH_ACCOUNT_NOT_FOUND,
          message:
            'No active account found for this Google email in the organization. Contact your admin.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.googleId) {
      await this.userRepository.linkGoogleAccount(user._id.toString(), googleUser.sub);
    } else if (user.googleId !== googleUser.sub) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'This account is linked to a different Google profile',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.authService.buildAuthResponseForUser(user, tenant._id.toString());
  }

  private ensureEnabled(): void {
    if (!this.isEnabled()) {
      throw new BusinessException(
        {
          code: ErrorCodes.OAUTH_NOT_CONFIGURED,
          message: 'Google sign-in is not configured',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private parseState(state: string): OAuthState {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as OAuthState;
      if (!parsed.tenantSlug) {
        throw new Error('Missing tenant slug');
      }
      return parsed;
    } catch {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid OAuth state',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async fetchGoogleUser(code: string): Promise<GoogleUserInfo> {
    const config = this.configService.get('googleOAuth', { infer: true });
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        redirect_uri: config.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Failed to exchange Google authorization code',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Failed to load Google profile',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return (await profileResponse.json()) as GoogleUserInfo;
  }
}
