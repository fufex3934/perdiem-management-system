import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SAML, type SamlConfig, type Profile } from '@node-saml/node-saml';
import { ErrorCodes } from '@/common/constants/error-codes';
import { UserStatus } from '@/common/enums/user-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AllConfig } from '@/infrastructure/config/configuration';
import { TenantService } from '../tenant/tenant.service';
import { UserRepository } from '../users/user.repository';
import { AuthService } from './auth.service';

interface SamlState {
  tenantSlug: string;
}

@Injectable()
export class SamlAuthService {
  constructor(
    private readonly configService: ConfigService<AllConfig, true>,
    private readonly tenantService: TenantService,
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  isEnabled(): boolean {
    const config = this.configService.get('saml', { infer: true });
    return Boolean(config.enabled && config.entryPoint && config.issuer && config.idpCert);
  }

  async getAuthorizationUrl(tenantSlug: string): Promise<string> {
    this.ensureEnabled();
    const saml = this.createSamlClient();
    const relayState = Buffer.from(
      JSON.stringify({ tenantSlug } satisfies SamlState),
    ).toString('base64url');

    return saml.getAuthorizeUrlAsync(relayState, undefined, {});
  }

  async handleCallback(body: Record<string, string>, relayState?: string) {
    this.ensureEnabled();
    const { tenantSlug } = this.parseRelayState(relayState);
    const tenant = await this.tenantService.getBySlug(tenantSlug);
    const saml = this.createSamlClient();
    const { profile } = await saml.validatePostResponseAsync(body);

    if (!profile) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'SAML response did not include a valid profile',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const email = this.extractEmail(profile);
    const nameId = profile.nameID;

    if (!email || !nameId) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'SAML assertion did not include email or name identifier',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userRepository.findByEmailInTenant(
      tenant._id.toString(),
      email.toLowerCase(),
    );

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BusinessException(
        {
          code: ErrorCodes.OAUTH_ACCOUNT_NOT_FOUND,
          message:
            'No active account found for this SSO email in the organization. Contact your admin.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.samlNameId) {
      await this.userRepository.linkSamlAccount(user._id.toString(), nameId);
    } else if (user.samlNameId !== nameId) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'This account is linked to a different SSO identity',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.authService.buildAuthResponseForUser(user, tenant._id.toString());
  }

  async getServiceProviderMetadata(): Promise<string> {
    this.ensureEnabled();
    const saml = this.createSamlClient();
    return saml.generateServiceProviderMetadata(null, null);
  }

  private createSamlClient(): SAML {
    const config = this.configService.get('saml', { infer: true });
    const samlConfig: SamlConfig = {
      entryPoint: config.entryPoint!,
      issuer: config.issuer!,
      callbackUrl: config.callbackUrl,
      idpCert: config.idpCert!,
      wantAssertionsSigned: true,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    };

    return new SAML(samlConfig);
  }

  private ensureEnabled(): void {
    if (!this.isEnabled()) {
      throw new BusinessException(
        {
          code: ErrorCodes.OAUTH_NOT_CONFIGURED,
          message: 'SAML SSO is not configured',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private parseRelayState(relayState?: string): SamlState {
    if (!relayState?.trim()) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Missing SAML relay state',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(relayState, 'base64url').toString('utf8'),
      ) as SamlState;
      if (!parsed.tenantSlug) throw new Error('Missing tenant slug');
      return parsed;
    } catch {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid SAML relay state',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private extractEmail(profile: Profile): string | undefined {
    const direct = profile.email ?? profile.mail ?? profile.nameID;
    if (typeof direct === 'string' && direct.includes('@')) {
      return direct.toLowerCase();
    }

    const claimEmail =
      profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    if (typeof claimEmail === 'string') {
      return claimEmail.toLowerCase();
    }

    if (typeof profile.nameID === 'string' && profile.nameID.includes('@')) {
      return profile.nameID.toLowerCase();
    }

    return undefined;
  }
}
