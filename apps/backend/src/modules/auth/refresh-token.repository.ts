import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  create(data: Partial<RefreshToken>): Promise<RefreshTokenDocument> {
    return this.refreshTokenModel.create(data);
  }

  findValidByUser(
    tenantId: string,
    userId: string,
  ): Promise<RefreshTokenDocument[]> {
    return this.refreshTokenModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
      .select('+tokenHash')
      .exec();
  }

  revokeAllForUser(tenantId: string, userId: string): Promise<void> {
    return this.refreshTokenModel
      .updateMany(
        {
          tenantId: new Types.ObjectId(tenantId),
          userId: new Types.ObjectId(userId),
          isRevoked: false,
        },
        { isRevoked: true, revokedAt: new Date() },
      )
      .exec()
      .then(() => undefined);
  }

  revokeById(id: string): Promise<void> {
    return this.refreshTokenModel
      .updateOne(
        { _id: id, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() },
      )
      .exec()
      .then(() => undefined);
  }
}
