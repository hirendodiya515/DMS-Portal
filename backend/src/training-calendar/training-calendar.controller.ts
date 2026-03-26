import {
  Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Query
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
  @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.DEPT_HEAD, UserRole.CREATOR)
  createTraining(@Body() dto: CreateTrainingCalendarDto) {
    return this.service.createTraining(dto);
  }

  @Get()
  getAllTrainings() {
    return this.service.getAllTrainings();
  }

  @Get('annual-plans')
  getAnnualPlans() {
    return this.service.getAnnualPlans();
  }

  @Post('annual-plans')
  @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.DEPT_HEAD, UserRole.CREATOR)
  createAnnualPlan(@Body() dto: { topic: string; month: number; year: number; department?: string }) {
    return this.service.createAnnualPlan(dto);
  }

  @Delete('annual-plans/:id')
  @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.DEPT_HEAD, UserRole.CREATOR)
  deleteAnnualPlan(@Param('id') id: string) {
    return this.service.deleteAnnualPlan(id);
  }

  @Get('analytics/aggregate')
  getAggregateAnalytics(
    @Query('startDate') startDate?: string, 
    @Query('endDate') endDate?: string,
    @Query('department') department?: string
  ) {
    return this.service.getAggregateAnalytics(startDate, endDate, department);
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

  @Get(':id/analytics')
  getAnalytics(@Param('id') id: string) {
    return this.service.getAnalyticsByTraining(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.DEPT_HEAD, UserRole.CREATOR)
  updateTraining(@Param('id') id: string, @Body() dto: UpdateTrainingCalendarDto) {
    return this.service.updateTraining(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.DEPT_HEAD, UserRole.CREATOR)
  deleteTraining(@Param('id') id: string) {
    return this.service.deleteTraining(id);
  }

  @Post('sync')
  @Roles(UserRole.ADMIN)
  triggerSync() {
    return this.service.triggerSync();
  }
}
