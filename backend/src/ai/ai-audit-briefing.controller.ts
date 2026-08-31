import { Controller, Get, Query } from '@nestjs/common';
import { AiAuditBriefingService, PreAuditBriefingResponse } from './ai-audit-briefing.service';

@Controller('ai')
export class AiAuditBriefingController {
  constructor(private readonly briefingService: AiAuditBriefingService) {}

  @Get('pre-audit-briefing')
  async getPreAuditBriefing(
    @Query('scheduleId') scheduleId?: string,
    @Query('department') department?: string,
  ): Promise<PreAuditBriefingResponse> {
    return this.briefingService.generatePreAuditBriefing(scheduleId, department);
  }
}
