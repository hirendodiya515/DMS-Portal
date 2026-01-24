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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto, UpdateEquipmentDto, CreateCalibrationHistoryDto } from './dto/equipment.dto';

@Controller('equipment')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // Helper to check if user is admin or creator
  private checkAdminOrCreator(user: any) {
    if (user.role !== 'admin' && user.role !== 'creator') {
      throw new ForbiddenException('Only admin and creator roles can perform this action');
    }
  }

  @Post()
  create(@Body() createDto: CreateEquipmentDto, @Request() req) {
    this.checkAdminOrCreator(req.user);
    return this.equipmentService.create(createDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('calibrationStatus') calibrationStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.equipmentService.findAll({ department, status, calibrationStatus, search });
  }

  @Get('dashboard')
  getDashboard() {
    return this.equipmentService.getDashboard();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateEquipmentDto, @Request() req) {
    this.checkAdminOrCreator(req.user);
    return this.equipmentService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    this.checkAdminOrCreator(req.user);
    return this.equipmentService.remove(id);
  }

  // Calibration History endpoints
  @Post(':id/calibration-history')
  addCalibrationHistory(
    @Param('id') id: string,
    @Body() createDto: CreateCalibrationHistoryDto,
    @Request() req,
  ) {
    return this.equipmentService.addCalibrationHistory(id, createDto, req.user.userId);
  }

  @Get(':id/calibration-history')
  getCalibrationHistory(@Param('id') id: string) {
    return this.equipmentService.getCalibrationHistory(id);
  }

  @Delete('calibration-history/:historyId')
  deleteCalibrationHistory(@Param('historyId') historyId: string, @Request() req) {
    this.checkAdminOrCreator(req.user);
    return this.equipmentService.deleteCalibrationHistory(historyId);
  }
}
