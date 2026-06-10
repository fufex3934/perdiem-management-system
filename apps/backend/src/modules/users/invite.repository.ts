import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invite, InviteDocument } from './schemas/invite.schema';

@Injectable()
export class InviteRepository {
  constructor(
    @InjectModel(Invite.name) private readonly inviteModel: Model<InviteDocument>,
  ) {}

  create(data: Partial<Invite>): Promise<InviteDocument> {
    return this.inviteModel.create(data);
  }

  findByIdInTenant(tenantId: string, inviteId: string): Promise<InviteDocument | null> {
    return this.inviteModel
      .findOne({
        _id: inviteId,
        tenantId: new Types.ObjectId(tenantId),
        isRevoked: false,
        acceptedAt: null,
      })
      .exec();
  }

  findPendingByEmailInTenant(
    tenantId: string,
    email: string,
  ): Promise<InviteDocument | null> {
    return this.inviteModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        email: email.toLowerCase(),
        isRevoked: false,
        acceptedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  findAllPendingInTenant(tenantId: string): Promise<InviteDocument[]> {
    return this.inviteModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        isRevoked: false,
        acceptedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  findValidByTokenHash(tokenHash: string): Promise<InviteDocument | null> {
    return this.inviteModel
      .findOne({
        tokenHash,
        isRevoked: false,
        acceptedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  markAccepted(inviteId: string): Promise<void> {
    return this.inviteModel
      .updateOne({ _id: inviteId }, { acceptedAt: new Date() })
      .exec()
      .then(() => undefined);
  }

  revoke(inviteId: string, tenantId: string): Promise<boolean> {
    return this.inviteModel
      .updateOne(
        {
          _id: inviteId,
          tenantId: new Types.ObjectId(tenantId),
          isRevoked: false,
          acceptedAt: null,
        },
        { isRevoked: true, revokedAt: new Date() },
      )
      .exec()
      .then((result) => result.modifiedCount > 0);
  }
}
