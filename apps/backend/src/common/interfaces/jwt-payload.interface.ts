import { UserRole } from '../enums/user-role.enum';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: UserRole;
  type: TokenType;
  jti?: string;
}
