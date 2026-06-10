import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { MocService } from './moc.service';
import { MocRecord } from '../entities/moc-record.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('moc')
@UseGuards(JwtAuthGuard)
export class MocController {
    constructor(private readonly mocService: MocService) {}

    @Post()
    create(@Body() data: Partial<MocRecord>, @Request() req: any) {
        return this.mocService.create(data, req.user.userId);
    }

    @Get('next-number')
    async getNextNumber() {
        const nextNumber = await this.mocService.generateMocNumber();
        return { nextNumber };
    }

    @Get('logs')
    getLogs() {
        return this.mocService.findLogs();
    }

    @Get()
    findAll() {
        return this.mocService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.mocService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: Partial<MocRecord>, @Request() req: any) {
        return this.mocService.update(id, data, req.user.userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.mocService.remove(id, req.user.userId);
    }
}
