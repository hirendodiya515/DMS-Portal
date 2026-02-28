import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TrainingCalendar } from '../entities/training-calendar.entity';
import { TrainingAttendance } from '../entities/training-attendance.entity';
import { TrainingCalendarService } from './training-calendar.service';
import { TrainingCalendarController } from './training-calendar.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainingCalendar, TrainingAttendance]),
    HttpModule,
  ],
  providers: [TrainingCalendarService],
  controllers: [TrainingCalendarController],
  exports: [TrainingCalendarService],
})
export class TrainingCalendarModule {}
