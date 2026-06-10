import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ErrorCodes } from '@/common/constants/error-codes';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { AllConfig } from '@/infrastructure/config/configuration';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(configService: ConfigService<AllConfig, true>) {
    const jwtConfig = configService.get('jwt', { infer: true });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessSecret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      throw new BusinessException(
        {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Invalid access token',
        },
        401,
      );
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
    };
  }
}
