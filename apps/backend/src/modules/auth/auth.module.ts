import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AllConfig } from '@/infrastructure/config/configuration';
import { SecurityModule } from '../security/security.module';
import { TenantModule } from '../tenant/tenant.module';
import { UserModule } from '../users/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfig, true>) => {
        const jwtConfig = configService.get('jwt', { infer: true });
        return {
          secret: jwtConfig.accessSecret,
          signOptions: {
            expiresIn: jwtConfig.accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    TenantModule,
    SecurityModule,
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenRepository, JwtAccessStrategy],
  exports: [AuthService, RefreshTokenRepository],
})
export class AuthModule {}
