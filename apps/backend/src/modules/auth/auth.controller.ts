import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { HttpContextParam } from '@/common/decorators/http-context.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';
import { HttpContext } from '@/common/interfaces/http-context.interface';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { InviteService } from '../users/invite.service';
import { SecurityAuditService } from '../security/security-audit.service';
import { TenantService } from '../tenant/tenant.service';
import { AuthService } from './auth.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly inviteService: InviteService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly tenantService: TenantService,
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
}
