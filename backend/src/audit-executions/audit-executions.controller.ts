import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditExecutionsService } from './audit-executions.service';
import { PdfService } from './pdf.service';

@Controller('audit-executions')
export class AuditExecutionsController {
  constructor(
    private readonly service: AuditExecutionsService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  getSummary(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.service.getSummary(startDate, endDate);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  async downloadPDF(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateAuditReportPDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=audit-report-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Get()
  findAll(@Query('scheduleId') scheduleId?: string) {
    return this.service.findAll(scheduleId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
