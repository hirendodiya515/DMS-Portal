import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Risk } from '../entities/risk.entity';
import { RiskAssessmentItem } from '../entities/risk-assessment-item.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { RisksController } from './risks.controller';
import { RisksService } from './risks.service';
import { HiraRisksModule } from './hira/hira-risks.module';
import { EaaRisksModule } from './eaa/eaa-risks.module';
import { QraRisksModule } from './qra/qra-risks.module';
import { PfmeaModule } from './pfmea/pfmea.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Risk, RiskAssessmentItem, User, AuditLog]),
    HiraRisksModule,
    EaaRisksModule,
    QraRisksModule,
    PfmeaModule,
  ],
  controllers: [RisksController],
  providers: [RisksService],
  exports: [RisksService],
})
export class RisksModule {}
