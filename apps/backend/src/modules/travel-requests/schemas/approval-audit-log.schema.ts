import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApprovalAuditAction } from '@/common/enums/approval-audit-action.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';

export type ApprovalAuditLogDocument = HydratedDocument<ApprovalAuditLog>;

@Schema({ timestamps: true, collection: 'approval_audit_logs' })
export class ApprovalAuditLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  travelRequestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  actorId: Types.ObjectId;

  @Prop({ type: String, enum: UserRole, required: true })
  actorRole: UserRole;

  @Prop({ type: String, enum: ApprovalAuditAction, required: true })
  action: ApprovalAuditAction;

  @Prop({ type: Number, default: null })
  step: number | null;

  @Prop({ trim: true, default: '' })
  comment: string;

  @Prop({ type: String, enum: TravelRequestStatus, required: true })
  previousStatus: TravelRequestStatus;

  @Prop({ type: String, enum: TravelRequestStatus, required: true })
  newStatus: TravelRequestStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ApprovalAuditLogSchema = SchemaFactory.createForClass(ApprovalAuditLog);

ApprovalAuditLogSchema.index({ tenantId: 1, travelRequestId: 1, createdAt: 1 });
