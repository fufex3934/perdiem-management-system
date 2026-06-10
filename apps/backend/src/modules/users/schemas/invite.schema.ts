import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '@/common/enums/user-role.enum';

export type InviteDocument = HydratedDocument<Invite>;

@Schema({ timestamps: true, collection: 'invites' })
export class Invite {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Prop({ type: Types.ObjectId, required: true })
  invitedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, select: false })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);

InviteSchema.index({ tenantId: 1, email: 1, isRevoked: 1 });
InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
