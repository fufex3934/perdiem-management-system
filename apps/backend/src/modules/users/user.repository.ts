import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '@/common/enums/user-role.enum';
import { UserStatus } from '@/common/enums/user-status.enum';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  create(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  findByEmailInTenant(
    tenantId: string,
    email: string,
    includePassword = false,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      email: email.toLowerCase(),
      isDeleted: false,
    });

    if (includePassword) {
      query.select('+password');
    }

    return query.exec();
  }

  findByIdInTenant(tenantId: string, userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        _id: userId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();
  }

  existsByEmailInTenant(tenantId: string, email: string): Promise<boolean> {
    return this.userModel
      .exists({
        tenantId: new Types.ObjectId(tenantId),
        email: email.toLowerCase(),
        isDeleted: false,
      })
      .then((result) => Boolean(result));
  }

  createAdminUser(data: {
    tenantId: Types.ObjectId;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<UserDocument> {
    return this.userModel.create({
      ...data,
      email: data.email.toLowerCase(),
      role: UserRole.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
    });
  }
}
