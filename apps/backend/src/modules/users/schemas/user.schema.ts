import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '@/common/enums/user-role.enum';
import { UserStatus } from '@/common/enums/user-status.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ type: Types.ObjectId, default: null })
  invitedBy: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  googleId: string | null;

  @Prop({ type: String, default: null })
  microsoftId: string | null;

  @Prop({ type: String, default: null })
  samlNameId: string | null;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, status: 1, isDeleted: 1 });
