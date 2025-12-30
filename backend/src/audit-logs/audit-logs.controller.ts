import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('section') section?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
  ) {
    return this.auditLogsService.findAll({
      startDate,
      endDate,
      section,
      action,
      search,
    });
  }

  @Get('export')
  async export(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('section') section?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
  ) {
    const buffer = await this.auditLogsService.exportLogs({
      startDate,
      endDate,
      section,
      action,
      search,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit-logs-${new Date().toISOString()}.xlsx`,
    );

    res.send(buffer);
  }
}
