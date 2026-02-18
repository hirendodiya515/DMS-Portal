import { Controller, Post, UseGuards } from '@nestjs/common';
import { CalibrationAlertService } from './calibration-alert.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('calibration-alert')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalibrationAlertController {
  constructor(private readonly calibrationAlertService: CalibrationAlertService) {}

  @Post('trigger-check')
  @Roles(UserRole.ADMIN)
  async triggerCheck() {
    await this.calibrationAlertService.checkAndSendAlerts();
    return { message: 'Manual calibration alert check triggered successfully' };
  }
}
