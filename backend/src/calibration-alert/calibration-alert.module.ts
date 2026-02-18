import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalibrationAlertService } from './calibration-alert.service';
import { CalibrationAlertController } from './calibration-alert.controller';
import { Equipment } from '../entities/equipment.entity';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment, User, Notification]),
    MailModule,
  ],
  providers: [CalibrationAlertService],
  controllers: [CalibrationAlertController],
})
export class CalibrationAlertModule {}
