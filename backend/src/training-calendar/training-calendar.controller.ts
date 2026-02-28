import {
  Body, Controller, Delete, Get, Param, Post, Put, UseGuards
} from '@nestjs/common';
import { TrainingCalendarService } from './training-calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateTrainingCalendarDto, UpdateTrainingCalendarDto } from './dto/training-calendar.dto';

@Controller('training-calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingCalendarController {
  constructor(private readonly service: TrainingCalendarService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.REVIEWER)
  createTraining(@Body() dto: CreateTrainingCalendarDto) {
    return this.service.createTraining(dto);
  }

  @Get()
  getAllTrainings() {
    return this.service.getAllTrainings();
  }

  @Get(':id')
  getTrainingById(@Param('id') id: string) {
    return this.service.getTrainingById(id);
  }

  @Get(':id/qr')
  getQrCode(@Param('id') id: string) {
    return this.service.getQrCode(id);
  }

  @Get(':id/attendance')
  getAttendance(@Param('id') id: string) {
    return this.service.getAttendanceByTraining(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.REVIEWER)
  updateTraining(@Param('id') id: string, @Body() dto: UpdateTrainingCalendarDto) {
    return this.service.updateTraining(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.REVIEWER)
  deleteTraining(@Param('id') id: string) {
    return this.service.deleteTraining(id);
  }

  @Post('sync')
  @Roles(UserRole.ADMIN)
  triggerSync() {
    return this.service.triggerSync();
  }
}
