import { PolicyVersionDocument } from '../schemas/policy-version.schema';

export class PolicyVersionResponseDto {
  id: string;
  policyId: string;
  version: number;
  snapshot: PolicyVersionDocument['snapshot'];
  changedBy: string;
  changedByEmail: string;
  createdAt: Date;

  static fromDocument(doc: PolicyVersionDocument): PolicyVersionResponseDto {
    return {
      id: doc._id.toString(),
      policyId: doc.policyId.toString(),
      version: doc.version,
      snapshot: doc.snapshot,
      changedBy: doc.changedBy.toString(),
      changedByEmail: doc.changedByEmail,
      createdAt: doc.createdAt ?? new Date(),
    };
  }
}
