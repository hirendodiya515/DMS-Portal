import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowchartService } from './flowchart.service';
import { FlowchartController } from './flowchart.controller';
import { Flowchart } from '../entities/flowchart.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Flowchart])],
  controllers: [FlowchartController],
  providers: [FlowchartService],
  exports: [FlowchartService],
})
export class FlowchartModule {}
