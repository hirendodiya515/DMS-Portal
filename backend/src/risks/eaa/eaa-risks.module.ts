import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EaaRisksController } from './eaa-risks.controller';
import { EaaRisksService } from './eaa-risks.service';
import { EaaRisk } from '../../entities/eaa-risk.entity';
import { RiskAssessmentItem } from '../../entities/risk-assessment-item.entity';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EaaRisk, RiskAssessmentItem, User, AuditLog])],
  controllers: [], // Consolidated into RisksController
  providers: [EaaRisksService],
  exports: [EaaRisksService],
})
export class EaaRisksModule {}
