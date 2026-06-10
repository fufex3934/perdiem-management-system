import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApprovalStepStatus } from '@/common/enums/approval-step-status.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';

export type TravelRequestDocument = HydratedDocument<TravelRequest>;

@Schema({ _id: false })
export class ApprovalStep {
  @Prop({ required: true })
  step: number;

  @Prop({ type: String, enum: UserRole, required: true })
  requiredRole: UserRole;

  @Prop({
    type: String,
    enum: ApprovalStepStatus,
    default: ApprovalStepStatus.PENDING,
  })
  status: ApprovalStepStatus;

  @Prop({ type: Types.ObjectId, default: null })
  actedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  actedAt: Date | null;

  @Prop({ trim: true, default: '' })
  comment: string;
}

export const ApprovalStepSchema = SchemaFactory.createForClass(ApprovalStep);

@Schema({ timestamps: true, collection: 'travel_requests' })
export class TravelRequest {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: UserRole, required: true })
  requesterRole: UserRole;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: '' })
  purpose: string;

  @Prop({ required: true, uppercase: true, trim: true, minlength: 2, maxlength: 2 })
  destinationCountryCode: string;

  @Prop({ trim: true, default: '' })
  destinationCity: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ required: true, min: 1 })
  days: number;

  @Prop({ type: Types.ObjectId, required: true })
  policyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  policyName: string;

  @Prop({ required: true, min: 0 })
  dailyRate: number;

  @Prop({ required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, enum: UserRole, default: null })
  appliedPolicyRole: UserRole | null;

  @Prop({
    type: String,
    enum: TravelRequestStatus,
    default: TravelRequestStatus.DRAFT,
    index: true,
  })
  status: TravelRequestStatus;

  @Prop({ type: Date, default: null })
  submittedAt: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: [ApprovalStepSchema], default: [] })
  approvalSteps: ApprovalStep[];

  @Prop({ default: -1 })
  currentStepIndex: number;

  @Prop({ type: Date, default: null })
  approvedAt: Date | null;

  @Prop({ type: Date, default: null })
  rejectedAt: Date | null;

  @Prop({ trim: true, default: '' })
  rejectionComment: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TravelRequestSchema = SchemaFactory.createForClass(TravelRequest);

TravelRequestSchema.index({ tenantId: 1, userId: 1, status: 1, isDeleted: 1 });
TravelRequestSchema.index({ tenantId: 1, status: 1, isDeleted: 1, createdAt: -1 });
