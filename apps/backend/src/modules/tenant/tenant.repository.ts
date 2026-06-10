import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './schemas/tenant.schema';

@Injectable()
export class TenantRepository {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  create(data: Partial<Tenant>): Promise<TenantDocument> {
    return this.tenantModel.create(data);
  }

  findBySlug(slug: string): Promise<TenantDocument | null> {
    return this.tenantModel
      .findOne({ slug: slug.toLowerCase(), isDeleted: false })
      .exec();
  }

  findById(id: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ _id: id, isDeleted: false }).exec();
  }

  existsBySlug(slug: string): Promise<boolean> {
    return this.tenantModel
      .exists({ slug: slug.toLowerCase(), isDeleted: false })
      .then((result) => Boolean(result));
  }
}
