import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TrainingCalendar } from '../entities/training-calendar.entity';
import { TrainingAttendance } from '../entities/training-attendance.entity';
import { AnnualTrainingPlan } from '../entities/annual-training-plan.entity';
import { TrainingCalendarService } from './training-calendar.service';
import { TrainingCalendarController } from './training-calendar.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainingCalendar, TrainingAttendance, AnnualTrainingPlan]),
    HttpModule,
    SettingsModule,
  ],
  providers: [TrainingCalendarService],
  controllers: [TrainingCalendarController],
  exports: [TrainingCalendarService],
})
export class TrainingCalendarModule {}
