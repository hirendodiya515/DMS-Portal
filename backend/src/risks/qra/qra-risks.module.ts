import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QraRisksController } from './qra-risks.controller';
import { QraRisksService } from './qra-risks.service';
import { QraRisk } from '../../entities/qra-risk.entity';
import { RiskAssessmentItem } from '../../entities/risk-assessment-item.entity';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QraRisk, RiskAssessmentItem, User, AuditLog])],
  controllers: [], // Consolidated into RisksController
  providers: [QraRisksService],
  exports: [QraRisksService],
})
export class QraRisksModule {}
