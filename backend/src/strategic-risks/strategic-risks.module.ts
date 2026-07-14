import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrategicRisk } from '../entities/strategic-risk.entity';
import { SwotIssue } from '../entities/swot-issue.entity';
import { StrategicRisksService } from './strategic-risks.service';
import { StrategicRisksController } from './strategic-risks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StrategicRisk, SwotIssue])],
  controllers: [StrategicRisksController],
  providers: [StrategicRisksService],
})
export class StrategicRisksModule {}
