import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityAuditController } from './security-audit.controller';
import { SecurityAuditRepository } from './security-audit.repository';
import { SecurityAuditService } from './security-audit.service';
import {
  SecurityAuditLog,
  SecurityAuditLogSchema,
} from './schemas/security-audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SecurityAuditLog.name, schema: SecurityAuditLogSchema },
    ]),
  ],
  controllers: [SecurityAuditController],
  providers: [SecurityAuditRepository, SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityModule {}
