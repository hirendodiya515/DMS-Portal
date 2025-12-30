import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditPlansService } from './audit-plans.service';

@Controller('audit-plans')
export class AuditPlansController {
  constructor(private readonly auditPlansService: AuditPlansService) {}

  @Get()
  findAll() {
    return this.auditPlansService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  upsert(@Body() body: { department: string; month: string; isPlanned: boolean; outcome: 'actual' | 'cancelled' | null }) {
    return this.auditPlansService.upsert(body.department, body.month, body.isPlanned, body.outcome);
  }
}
