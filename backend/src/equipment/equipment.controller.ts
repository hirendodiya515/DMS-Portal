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

  // Helper to check department-based access
  private async checkDepartmentAccess(user: any, departmentOrId: string, action: 'create' | 'modify') {
    if (user.role === 'admin') return;

    if (user.role !== 'creator' && user.role !== 'reviewer') {
      throw new ForbiddenException('Only admin, creator, and reviewer roles can perform this action');
    }

    if (action === 'create') {
      if (user.department !== departmentOrId) {
        throw new ForbiddenException(`You can only create equipment for your own department (${user.department})`);
      }
    } else {
      const equipment = await this.equipmentService.findOne(departmentOrId);
      if (user.department !== equipment.department) {
        throw new ForbiddenException(`You can only modify equipment belonging to your department (${user.department})`);
      }
    }
  }

  @Post()
  async create(@Body() createDto: CreateEquipmentDto, @Request() req) {
    await this.checkDepartmentAccess(req.user, createDto.department, 'create');
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
  async update(@Param('id') id: string, @Body() updateDto: UpdateEquipmentDto, @Request() req) {
    await this.checkDepartmentAccess(req.user, id, 'modify');
    return this.equipmentService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.checkDepartmentAccess(req.user, id, 'modify');
    return this.equipmentService.remove(id);
  }

  // Calibration History endpoints
  @Post(':id/calibration-history')
  async addCalibrationHistory(
    @Param('id') id: string,
    @Body() createDto: CreateCalibrationHistoryDto,
    @Request() req,
  ) {
    await this.checkDepartmentAccess(req.user, id, 'modify');
    return this.equipmentService.addCalibrationHistory(id, createDto, req.user.userId);
  }

  @Get(':id/calibration-history')
  getCalibrationHistory(@Param('id') id: string) {
    return this.equipmentService.getCalibrationHistory(id);
  }

  @Delete('calibration-history/:historyId')
  async deleteCalibrationHistory(@Param('historyId') historyId: string, @Request() req) {
    if (req.user.role !== 'admin') {
      const history = await this.equipmentService.getCalibrationHistoryById(historyId);
      const equipment = await this.equipmentService.findOne(history.equipmentId);
      if (req.user.department !== equipment.department) {
        throw new ForbiddenException(`You can only delete calibration history for equipment in your department (${req.user.department})`);
      }
    }
    return this.equipmentService.deleteCalibrationHistory(historyId);
  }
}
