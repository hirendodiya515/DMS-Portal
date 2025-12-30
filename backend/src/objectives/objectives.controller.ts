import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ObjectivesService } from './objectives.service';
import {
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateMeasurementDto,
} from './dto/objectives.dto';

@Controller('objectives')
@UseGuards(JwtAuthGuard)
export class ObjectivesController {
  constructor(private readonly objectivesService: ObjectivesService) {}

  // ================== OBJECTIVES ==================

  @Post()
  create(@Body() createDto: CreateObjectiveDto, @Request() req: any) {
    return this.objectivesService.create(createDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    return this.objectivesService.findAll({ type, status, department, search });
  }

  @Get('dashboard')
  getDashboard(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.objectivesService.getDashboardStats({ type, status, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.objectivesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateObjectiveDto) {
    return this.objectivesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.objectivesService.remove(id);
  }

  // ================== MEASUREMENTS ==================

  @Post(':id/measurements')
  addMeasurement(
    @Param('id') id: string,
    @Body() createDto: CreateMeasurementDto,
    @Request() req: any,
  ) {
    return this.objectivesService.addMeasurement(id, createDto, req.user.userId);
  }

  @Get(':id/measurements')
  getMeasurements(@Param('id') id: string) {
    return this.objectivesService.getMeasurements(id);
  }

  @Delete('measurements/:measurementId')
  deleteMeasurement(@Param('measurementId') measurementId: string) {
    return this.objectivesService.deleteMeasurement(measurementId);
  }
}
