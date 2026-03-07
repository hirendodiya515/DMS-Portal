import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
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
  createIssue(@Body() data: any) {
    return this.orgContextService.createIssue(data);
  }

  @Put('issues/:id')
  @Roles(UserRole.ADMIN)
  updateIssue(@Param('id') id: string, @Body() data: any) {
    return this.orgContextService.updateIssue(id, data);
  }

  @Delete('issues/:id')
  @Roles(UserRole.ADMIN)
  deleteIssue(@Param('id') id: string) {
    return this.orgContextService.deleteIssue(id);
  }

  // Interested Parties
  @Get('parties')
  findAllParties() {
    return this.orgContextService.findAllParties();
  }

  @Post('parties')
  @Roles(UserRole.ADMIN)
  createParty(@Body() data: any) {
    return this.orgContextService.createParty(data);
  }

  @Put('parties/:id')
  @Roles(UserRole.ADMIN)
  updateParty(@Param('id') id: string, @Body() data: any) {
    return this.orgContextService.updateParty(id, data);
  }

  @Delete('parties/:id')
  @Roles(UserRole.ADMIN)
  deleteParty(@Param('id') id: string) {
    return this.orgContextService.deleteParty(id);
  }

  // IMS Scope
  @Get('scope')
  getImsScope() {
    return this.orgContextService.getImsScope();
  }

  @Post('scope')
  @Roles(UserRole.ADMIN)
  updateImsScope(@Body() data: any) {
    return this.orgContextService.updateImsScope(data);
  }
}
