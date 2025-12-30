import { Controller, Get, Post, Param, UseGuards, Request, Put } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    async findAll(@Request() req: any) {
        return this.notificationsService.findAllForUser(req.user.userId);
    }

    @Put(':id/read')
    async markAsRead(@Param('id') id: string, @Request() req: any) {
        return this.notificationsService.markAsRead(id, req.user.userId);
    }

    @Put('read-all')
    async markAllAsRead(@Request() req: any) {
        return this.notificationsService.markAllAsRead(req.user.userId);
    }
}
