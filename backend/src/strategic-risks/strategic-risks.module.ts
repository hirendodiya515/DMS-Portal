import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrategicRisk } from '../entities/strategic-risk.entity';
import { StrategicRisksService } from './strategic-risks.service';
import { StrategicRisksController } from './strategic-risks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StrategicRisk])],
  controllers: [StrategicRisksController],
  providers: [StrategicRisksService],
})
export class StrategicRisksModule {}
