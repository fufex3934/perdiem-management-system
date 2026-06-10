import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PolicyStatus } from '@/common/enums/policy-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';

export type PolicyVersionDocument = HydratedDocument<PolicyVersion>;

@Schema({ _id: false })
export class PolicyVersionSnapshot {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  countryCode: string;

  @Prop({ type: String, enum: UserRole, default: null })
  role: UserRole | null;

  @Prop({ required: true })
  dailyRate: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: String, enum: PolicyStatus, required: true })
  status: PolicyStatus;

  @Prop({ required: true })
  priority: number;

  @Prop({ type: Date, default: null })
  effectiveFrom: Date | null;

  @Prop({ type: Date, default: null })
  effectiveTo: Date | null;
}

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'policy_versions' })
export class PolicyVersion {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  policyId: Types.ObjectId;

  @Prop({ required: true })
  version: number;

  @Prop({ type: PolicyVersionSnapshot, required: true })
  snapshot: PolicyVersionSnapshot;

  @Prop({ type: Types.ObjectId, required: true })
  changedBy: Types.ObjectId;

  @Prop({ trim: true, default: '' })
  changedByEmail: string;

  createdAt?: Date;
}

export const PolicyVersionSchema = SchemaFactory.createForClass(PolicyVersion);

PolicyVersionSchema.index({ tenantId: 1, policyId: 1, version: -1 });
