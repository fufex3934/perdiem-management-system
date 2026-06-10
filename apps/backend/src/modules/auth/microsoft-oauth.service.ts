import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCodes } from '@/common/constants/error-codes';
import { UserStatus } from '@/common/enums/user-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AllConfig } from '@/infrastructure/config/configuration';
import { TenantService } from '../tenant/tenant.service';
import { UserRepository } from '../users/user.repository';
import { AuthService } from './auth.service';

interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
}

interface MicrosoftUserInfo {
  id: string;
  mail?: string;
  userPrincipalName?: string;
}

interface OAuthState {
  tenantSlug: string;
}

@Injectable()
export class MicrosoftOAuthService {
  constructor(
    private readonly configService: ConfigService<AllConfig, true>,
    private readonly tenantService: TenantService,
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  isEnabled(): boolean {
    const config = this.configService.get('microsoftOAuth', { infer: true });
    return Boolean(config.enabled && config.clientId && config.clientSecret);
  }

  getAuthorizationUrl(tenantSlug: string): string {
    this.ensureEnabled();
    const config = this.configService.get('microsoftOAuth', { infer: true });
    const state = Buffer.from(JSON.stringify({ tenantSlug } satisfies OAuthState)).toString(
      'base64url',
    );

    const params = new URLSearchParams({
      client_id: config.clientId!,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: 'openid profile email User.Read',
      state,
      response_mode: 'query',
    });

    return `https://login.microsoftonline.com/${config.directoryTenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string) {
    this.ensureEnabled();
    const { tenantSlug } = this.parseState(state);
    const tenant = await this.tenantService.getBySlug(tenantSlug);
    const microsoftUser = await this.fetchMicrosoftUser(code);
    const email = (microsoftUser.mail ?? microsoftUser.userPrincipalName ?? '').toLowerCase();

    if (!email) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Microsoft account did not return an email address',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userRepository.findByEmailInTenant(
      tenant._id.toString(),
      email,
    );

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BusinessException(
        {
          code: ErrorCodes.OAUTH_ACCOUNT_NOT_FOUND,
          message:
            'No active account found for this Microsoft email in the organization. Contact your admin.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.microsoftId) {
      await this.userRepository.linkMicrosoftAccount(user._id.toString(), microsoftUser.id);
    } else if (user.microsoftId !== microsoftUser.id) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'This account is linked to a different Microsoft profile',
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
          message: 'Microsoft sign-in is not configured',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private parseState(state: string): OAuthState {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as OAuthState;
      if (!parsed.tenantSlug) throw new Error('Missing tenant slug');
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

  private async fetchMicrosoftUser(code: string): Promise<MicrosoftUserInfo> {
    const config = this.configService.get('microsoftOAuth', { infer: true });
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${config.directoryTenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.clientId!,
          client_secret: config.clientSecret!,
          redirect_uri: config.callbackUrl,
          grant_type: 'authorization_code',
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Failed to exchange Microsoft authorization code',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenData = (await tokenResponse.json()) as MicrosoftTokenResponse;
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Failed to load Microsoft profile',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return (await profileResponse.json()) as MicrosoftUserInfo;
  }
}
