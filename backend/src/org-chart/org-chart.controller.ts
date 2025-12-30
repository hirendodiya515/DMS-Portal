import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { OrgChartService } from './org-chart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('org-chart')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrgChartController {
  constructor(private readonly orgChartService: OrgChartService) {}

  @Get()
  findAll() {
    return this.orgChartService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createOrgNodeDto: any, @Request() req) {
    return this.orgChartService.create(createOrgNodeDto, req.user?.userId);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN)
  bulkUpsert(@Body() nodes: any[], @Request() req) {
    return this.orgChartService.bulkUpsert(nodes, req.user?.userId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateOrgNodeDto: any, @Request() req) {
    return this.orgChartService.update(id, updateOrgNodeDto, req.user?.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req) {
    return this.orgChartService.remove(id, req.user?.userId);
  }
}
