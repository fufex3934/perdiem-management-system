import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '@/common/enums/user-role.enum';
import { UserStatus } from '@/common/enums/user-status.enum';
import { User, UserDocument } from './schemas/user.schema';

export interface ListUsersFilter {
  status?: UserStatus;
  role?: UserRole;
}

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

  findAllInTenant(
    tenantId: string,
    filter: ListUsersFilter,
    page: number,
    limit: number,
  ): Promise<{ items: UserDocument[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.role) {
      query.role = filter.role;
    }

    const skip = (page - 1) * limit;

    return Promise.all([
      this.userModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(query).exec(),
    ]).then(([items, total]) => ({ items, total }));
  }

  updateInTenant(
    tenantId: string,
    userId: string,
    update: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        {
          _id: userId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        { $set: update },
        { returnDocument: 'after' },
      )
      .exec();
  }

  softDeleteInTenant(tenantId: string, userId: string): Promise<boolean> {
    return this.userModel
      .updateOne(
        {
          _id: userId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        { isDeleted: true, deletedAt: new Date(), status: UserStatus.INACTIVE },
      )
      .exec()
      .then((result) => result.modifiedCount > 0);
  }

  countByRoleInTenant(tenantId: string, role: UserRole): Promise<number> {
    return this.userModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      role,
      isDeleted: false,
      status: UserStatus.ACTIVE,
    });
  }
}
