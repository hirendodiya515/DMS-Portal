import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OrgContextService } from './org-context.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('org-context')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrgContextController {
  constructor(private readonly orgContextService: OrgContextService) {}

  // SWOT Issues
  @Get('issues')
  findAllIssues() {
    return this.orgContextService.findAllIssues();
  }

  @Post('issues')
  @Roles(UserRole.ADMIN)
  createIssue(@Body() data: any, @Request() req) {
    return this.orgContextService.createIssue(data, req.user?.userId);
  }

  @Put('issues/:id')
  @Roles(UserRole.ADMIN)
  updateIssue(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.orgContextService.updateIssue(id, data, req.user?.userId);
  }

  @Delete('issues/:id')
  @Roles(UserRole.ADMIN)
  deleteIssue(@Param('id') id: string, @Request() req) {
    return this.orgContextService.deleteIssue(id, req.user?.userId);
  }

  // Interested Parties
  @Get('parties')
  findAllParties() {
    return this.orgContextService.findAllParties();
  }

  @Post('parties')
  @Roles(UserRole.ADMIN)
  createParty(@Body() data: any, @Request() req) {
    return this.orgContextService.createParty(data, req.user?.userId);
  }

  @Put('parties/:id')
  @Roles(UserRole.ADMIN)
  updateParty(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.orgContextService.updateParty(id, data, req.user?.userId);
  }

  @Delete('parties/:id')
  @Roles(UserRole.ADMIN)
  deleteParty(@Param('id') id: string, @Request() req) {
    return this.orgContextService.deleteParty(id, req.user?.userId);
  }

  // IMS Scope
  @Get('scope')
  getImsScope() {
    return this.orgContextService.getImsScope();
  }

  @Post('scope')
  @Roles(UserRole.ADMIN)
  updateImsScope(@Body() data: any, @Request() req) {
    return this.orgContextService.updateImsScope(data, req.user?.userId);
  }

  // History & Manual Reviews
  @Get('history')
  findAllHistory() {
    return this.orgContextService.findAllHistory();
  }

  @Post('review')
  @Roles(UserRole.ADMIN)
  logReview(@Body('details') details: string, @Request() req) {
    return this.orgContextService.logReview(req.user?.userId, details);
  }

  @Get('parties/export')
  async exportParties(@Res() res: Response) {
    const buffer = await this.orgContextService.exportParties();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=interested-parties-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    res.send(buffer);
  }
}
