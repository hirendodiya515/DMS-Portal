import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @Roles(UserRole.ADMIN)
    getAllSettings() {
        return this.settingsService.getAllSettings();
    }

    @Get(':key')
    getSetting(@Param('key') key: string) {
        return this.settingsService.getSetting(key);
    }

    @Post(':key')
    @Roles(UserRole.ADMIN)
    updateSetting(@Param('key') key: string, @Body() body: { value: any }) {
        return this.settingsService.updateSetting(key, body.value);
    }
}
