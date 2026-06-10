import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { ErrorCodes } from '@/common/constants/error-codes';
import { UserStatus } from '@/common/enums/user-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { UserDocument } from './schemas/user.schema';
import { UserRepository } from './user.repository';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createAdminUser(data: {
    tenantId: Types.ObjectId;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<UserDocument> {
    const emailExists = await this.userRepository.existsByEmailInTenant(
      data.tenantId.toString(),
      data.email,
    );

    if (emailExists) {
      throw new BusinessException(
        {
          code: ErrorCodes.EMAIL_EXISTS,
          message: 'Email is already registered for this tenant',
        },
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await this.hashPassword(data.password);

    return this.userRepository.createAdminUser({
      ...data,
      password: hashedPassword,
    });
  }

  async validateCredentials(
    tenantId: string,
    email: string,
    password: string,
  ): Promise<UserDocument> {
    const user = await this.userRepository.findByEmailInTenant(
      tenantId,
      email,
      true,
    );

    if (!user) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.ensureUserActive(user);

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }

  async getProfile(tenantId: string, userId: string): Promise<UserDocument> {
    const user = await this.userRepository.findByIdInTenant(tenantId, userId);

    if (!user) {
      throw new BusinessException(
        {
          code: ErrorCodes.USER_NOT_FOUND,
          message: 'User not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return user;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  private ensureUserActive(user: UserDocument): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new BusinessException(
        {
          code: ErrorCodes.USER_INACTIVE,
          message: 'User account is inactive',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
