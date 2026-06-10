import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TenantStatus } from '@/common/enums/tenant-status.enum';

export type TenantDocument = HydratedDocument<Tenant>;

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  slug: string;

  @Prop({
    type: String,
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

TenantSchema.index({ slug: 1 }, { unique: true });
TenantSchema.index({ status: 1, isDeleted: 1 });
