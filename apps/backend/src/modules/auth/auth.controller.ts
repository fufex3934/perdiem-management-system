import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { HttpContextParam } from '@/common/decorators/http-context.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';
import { HttpContext } from '@/common/interfaces/http-context.interface';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { AllConfig } from '@/infrastructure/config/configuration';
import { InviteService } from '../users/invite.service';
import { SecurityAuditService } from '../security/security-audit.service';
import { TenantService } from '../tenant/tenant.service';
import { AuthService } from './auth.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { GoogleOAuthService } from './google-oauth.service';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import { SamlAuthService } from './saml-auth.service';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { OAuthExchangeService } from './oauth-exchange.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly inviteService: InviteService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly tenantService: TenantService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly microsoftOAuthService: MicrosoftOAuthService,
    private readonly samlAuthService: SamlAuthService,
    private readonly oauthExchangeService: OAuthExchangeService,
    private readonly configService: ConfigService<AllConfig, true>,
  ) {}

  @Public()
  @RateLimit({ max: 5, ttlMs: 60_000 })
  @Post('register-tenant')
  async registerTenant(
    @Body() dto: RegisterTenantDto,
    @HttpContextParam() httpContext: HttpContext,
  ) {
    const result = await this.authService.registerTenant(dto);

    this.securityAuditService.record({
      tenantId: result.user.tenantId,
      userId: result.user.id,
      actorEmail: dto.email,
      action: SecurityAuditAction.AUTH_REGISTER_TENANT,
      resourceType: 'tenant',
      resourceId: result.user.tenantId,
      success: true,
      httpContext,
    });

    return result;
  }

  @Public()
  @RateLimit({ max: 10, ttlMs: 60_000 })
  @Post('login')
  async login(@Body() dto: LoginDto, @HttpContextParam() httpContext: HttpContext) {
    try {
      const result = await this.authService.login(dto);

      this.securityAuditService.record({
        tenantId: result.user.tenantId,
        userId: result.user.id,
        actorEmail: dto.email,
        action: SecurityAuditAction.AUTH_LOGIN_SUCCESS,
        resourceType: 'user',
        resourceId: result.user.id,
        success: true,
        httpContext,
      });

      return result;
    } catch (error) {
      let tenantId: string | undefined;

      try {
        const tenant = await this.tenantService.getBySlug(dto.tenantSlug);
        tenantId = tenant._id.toString();
      } catch {
        tenantId = undefined;
      }

      this.securityAuditService.record({
        tenantId,
        actorEmail: dto.email,
        action: SecurityAuditAction.AUTH_LOGIN_FAILED,
        resourceType: 'auth',
        success: false,
        metadata: { tenantSlug: dto.tenantSlug },
        httpContext,
      });

      throw error;
    }
  }

  @Public()
  @RateLimit({ max: 20, ttlMs: 60_000 })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto, @HttpContextParam() httpContext: HttpContext) {
    try {
      const result = await this.authService.refreshTokens(dto.refreshToken);

      this.securityAuditService.record({
        action: SecurityAuditAction.AUTH_REFRESH_TOKEN,
        resourceType: 'auth',
        success: true,
        httpContext,
      });

      return result;
    } catch (error) {
      this.securityAuditService.record({
        action: SecurityAuditAction.AUTH_REFRESH_TOKEN,
        resourceType: 'auth',
        success: false,
        httpContext,
      });

      throw error;
    }
  }

  @Public()
  @RateLimit({ max: 10, ttlMs: 60_000 })
  @Post('accept-invite')
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @HttpContextParam() httpContext: HttpContext,
  ) {
    const result = await this.inviteService.acceptInvite(dto.token, dto.password);

    this.securityAuditService.record({
      tenantId: result.tenantId,
      actorEmail: result.email,
      action: SecurityAuditAction.AUTH_ACCEPT_INVITE,
      resourceType: 'user',
      success: true,
      httpContext,
    });

    return result;
  }

  @Post('logout')
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @HttpContextParam() httpContext: HttpContext,
  ) {
    this.securityAuditService.record({
      tenantId: user.tenantId,
      userId: user.userId,
      actorEmail: user.email,
      action: SecurityAuditAction.AUTH_LOGOUT,
      resourceType: 'user',
      resourceId: user.userId,
      success: true,
      httpContext,
    });

    return this.authService.logout(user.tenantId, user.userId);
  }

  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.tenantId, user.userId);
  }

  @Public()
  @Get('oauth/config')
  oauthConfig() {
    return {
      google: this.googleOAuthService.isEnabled(),
      microsoft: this.microsoftOAuthService.isEnabled(),
      saml: this.samlAuthService.isEnabled(),
    };
  }

  @Public()
  @RateLimit({ max: 20, ttlMs: 60_000 })
  @Get('google')
  googleAuth(@Query('tenantSlug') tenantSlug: string, @Res() res: Response) {
    if (!tenantSlug?.trim()) {
      return res.status(400).json({ message: 'tenantSlug query parameter is required' });
    }
    const url = this.googleOAuthService.getAuthorizationUrl(tenantSlug.trim());
    return res.redirect(url);
  }

  @Public()
  @RateLimit({ max: 20, ttlMs: 60_000 })
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
    @HttpContextParam() httpContext: HttpContext,
  ) {
    const frontendOrigin = this.configService.get('app.corsOrigins', { infer: true })[0];

    try {
      const authResponse = await this.googleOAuthService.handleCallback(code, state);
      const exchangeCode = this.oauthExchangeService.createExchangeCode(authResponse);

      this.securityAuditService.record({
        tenantId: authResponse.user.tenantId,
        userId: authResponse.user.id,
        actorEmail: authResponse.user.email,
        action: SecurityAuditAction.AUTH_LOGIN_SUCCESS,
        resourceType: 'user',
        resourceId: authResponse.user.id,
        success: true,
        metadata: { provider: 'google' },
        httpContext,
      });

      return res.redirect(`${frontendOrigin}/auth/oauth?code=${exchangeCode}`);
    } catch {
      return res.redirect(`${frontendOrigin}/login?oauth_error=1`);
    }
  }

  @Public()
  @RateLimit({ max: 20, ttlMs: 60_000 })
  @Get('microsoft')
  microsoftAuth(@Query('tenantSlug') tenantSlug: string, @Res() res: Response) {
    if (!tenantSlug?.trim()) {
      return res.status(400).json({ message: 'tenantSlug query parameter is required' });
    }
    const url = this.microsoftOAuthService.getAuthorizationUrl(tenantSlug.trim());
    return res.redirect(url);
  }

  @Public()
  @RateLimit({ max: 20, ttlMs: 60_000 })
  @Get('microsoft/callback')
  async microsoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
    @HttpContextParam() httpContext: HttpContext,
  ) {
    const frontendOrigin = this.configService.get('app.corsOrigins', { infer: true })[0];

    try {
      const authResponse = await this.microsoftOAuthService.handleCallback(code, state);
      const exchangeCode = this.oauthExchangeService.createExchangeCode(authResponse);

      this.securityAuditService.record({
        tenantId: authResponse.user.tenantId,
        userId: authResponse.user.id,
        actorEmail: authResponse.user.email,
        action: SecurityAuditAction.AUTH_LOGIN_SUCCESS,
        resourceType: 'user',
        resourceId: authResponse.user.id,
        success: true,
        metadata: { provider: 'microsoft' },
        httpContext,
      });

      return res.redirect(`${frontendOrigin}/auth/oauth?code=${exchangeCode}`);
    } catch {
      return res.redirect(`${frontendOrigin}/login?oauth_error=1`);
    }
  }

  @Public()
  @RateLimit({ max: 20, ttlMs: 60_000 })
  @Get('saml')
  async samlAuth(@Query('tenantSlug') tenantSlug: string, @Res() res: Response) {
    if (!tenantSlug?.trim()) {
      return res.status(400).json({ message: 'tenantSlug query parameter is required' });
    }
    const url = await this.samlAuthService.getAuthorizationUrl(tenantSlug.trim());
    return res.redirect(url);
  }

  @Public()
  @RateLimit({ max: 20, ttlMs: 60_000 })
  @Post('saml/callback')
  async samlCallback(
    @Req() req: Request,
    @Res() res: Response,
    @HttpContextParam() httpContext: HttpContext,
  ) {
    const frontendOrigin = this.configService.get('app.corsOrigins', { infer: true })[0];
    const body = req.body as Record<string, string>;
    const relayState = body.RelayState;

    try {
      const authResponse = await this.samlAuthService.handleCallback(body, relayState);
      const exchangeCode = this.oauthExchangeService.createExchangeCode(authResponse);

      this.securityAuditService.record({
        tenantId: authResponse.user.tenantId,
        userId: authResponse.user.id,
        actorEmail: authResponse.user.email,
        action: SecurityAuditAction.AUTH_LOGIN_SUCCESS,
        resourceType: 'user',
        resourceId: authResponse.user.id,
        success: true,
        metadata: { provider: 'saml' },
        httpContext,
      });

      return res.redirect(`${frontendOrigin}/auth/oauth?code=${exchangeCode}`);
    } catch {
      return res.redirect(`${frontendOrigin}/login?oauth_error=1`);
    }
  }

  @Public()
  @Get('saml/metadata')
  async samlMetadata(@Res() res: Response) {
    const metadata = await this.samlAuthService.getServiceProviderMetadata();
    res.type('application/xml');
    return res.send(metadata);
  }

  @Public()
  @RateLimit({ max: 20, ttlMs: 60_000 })
  @Post('oauth/exchange')
  oauthExchange(@Body() dto: OAuthExchangeDto) {
    return this.oauthExchangeService.consumeExchangeCode(dto.code);
  }
}
