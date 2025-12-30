import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditParticipant } from '../entities/audit-participant.entity';
import { AuditParticipantsController } from './audit-participants.controller';
import { AuditParticipantsService } from './audit-participants.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditParticipant])],
  controllers: [AuditParticipantsController],
  providers: [AuditParticipantsService],
})
export class AuditParticipantsModule {}
