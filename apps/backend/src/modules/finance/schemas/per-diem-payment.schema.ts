import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentStatus } from '@/common/enums/payment-status.enum';

export type PerDiemPaymentDocument = HydratedDocument<PerDiemPayment>;

@Schema({ timestamps: true, collection: 'per_diem_payments' })
export class PerDiemPayment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  travelRequestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  travelTitle: string;

  @Prop({ required: true, uppercase: true, trim: true })
  destinationCountryCode: string;

  @Prop({ required: true, min: 1 })
  days: number;

  @Prop({ required: true, trim: true })
  policyName: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  @Prop({ trim: true, default: '' })
  paymentReference: string;

  @Prop({ trim: true, default: '' })
  notes: string;

  @Prop({ type: Types.ObjectId, default: null })
  processedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  paidAt: Date | null;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PerDiemPaymentSchema = SchemaFactory.createForClass(PerDiemPayment);

PerDiemPaymentSchema.index(
  { tenantId: 1, travelRequestId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
PerDiemPaymentSchema.index({ tenantId: 1, userId: 1, status: 1, isDeleted: 1 });
PerDiemPaymentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
