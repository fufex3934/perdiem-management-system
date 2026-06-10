import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PolicyStatus } from '@/common/enums/policy-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';

export type PerDiemPolicyDocument = HydratedDocument<PerDiemPolicy>;

@Schema({ timestamps: true, collection: 'per_diem_policies' })
export class PerDiemPolicy {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ required: true, uppercase: true, trim: true, minlength: 2, maxlength: 2 })
  countryCode: string;

  @Prop({ type: String, enum: UserRole, default: null })
  role: UserRole | null;

  @Prop({ required: true, min: 0 })
  dailyRate: number;

  @Prop({ required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3 })
  currency: string;

  @Prop({ type: String, enum: PolicyStatus, default: PolicyStatus.ACTIVE })
  status: PolicyStatus;

  @Prop({ required: true, default: 0 })
  priority: number;

  @Prop({ required: true, default: 1, min: 1 })
  version: number;

  @Prop({ type: Date, default: null })
  effectiveFrom: Date | null;

  @Prop({ type: Date, default: null })
  effectiveTo: Date | null;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PerDiemPolicySchema = SchemaFactory.createForClass(PerDiemPolicy);

PerDiemPolicySchema.index(
  { tenantId: 1, countryCode: 1, role: 1, status: 1, isDeleted: 1 },
  { name: 'policy_lookup' },
);
PerDiemPolicySchema.index({ tenantId: 1, name: 1, isDeleted: 1 });
