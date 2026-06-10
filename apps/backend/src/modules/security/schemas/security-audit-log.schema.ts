import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';

export type SecurityAuditLogDocument = HydratedDocument<SecurityAuditLog>;

@Schema({ timestamps: true, collection: 'security_audit_logs' })
export class SecurityAuditLog {
  @Prop({ type: Types.ObjectId, index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  @Prop({ type: String })
  actorEmail?: string;

  @Prop({ type: String, enum: SecurityAuditAction, required: true, index: true })
  action: SecurityAuditAction;

  @Prop({ type: String })
  resourceType?: string;

  @Prop({ type: String })
  resourceId?: string;

  @Prop({ type: Boolean, required: true })
  success: boolean;

  @Prop({ type: String, required: true })
  ip: string;

  @Prop({ type: String, required: true })
  userAgent: string;

  @Prop({ type: String, required: true })
  requestId: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SecurityAuditLogSchema = SchemaFactory.createForClass(SecurityAuditLog);

SecurityAuditLogSchema.index({ tenantId: 1, createdAt: -1 });
SecurityAuditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });
