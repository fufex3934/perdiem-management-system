import { UserRole } from '@/common/enums/user-role.enum';

export class AuthUserDto {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export class AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthResponseDto {
  user: AuthUserDto;
  tokens: AuthTokensDto;
}

export class TokenRefreshResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
