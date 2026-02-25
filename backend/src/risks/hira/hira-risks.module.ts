import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HiraRisksController } from './hira-risks.controller';
import { HiraRisksService } from './hira-risks.service';
import { HiraRisk } from '../../entities/hira-risk.entity';
import { RiskAssessmentItem } from '../../entities/risk-assessment-item.entity';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HiraRisk, RiskAssessmentItem, User, AuditLog])],
  controllers: [], // Consolidated into RisksController
  providers: [HiraRisksService],
  exports: [HiraRisksService],
})
export class HiraRisksModule {}
