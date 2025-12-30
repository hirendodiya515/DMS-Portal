import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditSchedule } from '../entities/audit-schedule.entity';
import { AuditParticipant } from '../entities/audit-participant.entity';
import { AuditSchedulesController } from './audit-schedules.controller';
import { AuditSchedulesService } from './audit-schedules.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditSchedule, AuditParticipant])],
  controllers: [AuditSchedulesController],
  providers: [AuditSchedulesService],
})
export class AuditSchedulesModule {}
