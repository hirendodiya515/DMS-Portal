import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditExecution } from '../entities/audit-execution.entity';
import { AuditExecutionsController } from './audit-executions.controller';
import { AuditExecutionsService } from './audit-executions.service';

import { AuditParticipant } from '../entities/audit-participant.entity';
import { AuditSchedule } from '../entities/audit-schedule.entity';
import { PdfService } from './pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditExecution, AuditSchedule, AuditParticipant])],
  controllers: [AuditExecutionsController],
  providers: [AuditExecutionsService, PdfService],
})
export class AuditExecutionsModule {}
