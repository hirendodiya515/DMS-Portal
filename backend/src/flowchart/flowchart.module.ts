import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowchartService } from './flowchart.service';
import { FlowchartController } from './flowchart.controller';
import { Flowchart } from '../entities/flowchart.entity';
import { Document } from '../entities/document.entity';
import { Equipment } from '../entities/equipment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Flowchart, Document, Equipment])],
  controllers: [FlowchartController],
  providers: [FlowchartService],
  exports: [FlowchartService],
})
export class FlowchartModule {}
