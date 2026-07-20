import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FlowchartService } from './flowchart.service';
import { Flowchart } from '../entities/flowchart.entity';
import { Public } from '../auth/public.decorator';

@Controller('flowcharts')
export class FlowchartController {
  constructor(private readonly flowchartService: FlowchartService) {}

  @Get()
  findAll() {
    return this.flowchartService.findAll();
  }

  @Get('latest')
  getLatest() {
    return this.flowchartService.getLatest();
  }

  @Public()
  @Get('summary/:nodeId')
  getNodeSummary(
    @Param('nodeId') nodeId: string,
    @Query('label') label?: string,
    @Query('dept') dept?: string,
  ) {
    return this.flowchartService.getNodeSummary(nodeId, label, dept);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flowchartService.findOne(id);
  }

  @Post()
  createOrUpdate(@Body() data: Partial<Flowchart>) {
    return this.flowchartService.createOrUpdate(data);
  }
}
