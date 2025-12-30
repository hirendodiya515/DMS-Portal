import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FlowchartService } from './flowchart.service';
import { Flowchart } from '../entities/flowchart.entity';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flowchartService.findOne(id);
  }

  @Post()
  createOrUpdate(@Body() data: Partial<Flowchart>) {
    return this.flowchartService.createOrUpdate(data);
  }
}
