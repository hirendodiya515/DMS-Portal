import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { StrategicRisksService } from './strategic-risks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('strategic-risks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StrategicRisksController {
  constructor(private readonly strategicRisksService: StrategicRisksService) {}

  @Get()
  findAll() {
    return this.strategicRisksService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DEPT_HEAD) // Admin and HOD can create
  create(@Body() data: any) {
    return this.strategicRisksService.create(data);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.DEPT_HEAD) // Admin and HOD can edit deeply
  update(@Param('id') id: string, @Body() data: any) {
    return this.strategicRisksService.update(id, data);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.DEPT_HEAD) // Admin and HOD can update status
  updateStatus(@Param('id') id: string, @Body('status') status: 'Open' | 'Mitigated' | 'Closed') {
    return this.strategicRisksService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Only Admin can delete
  remove(@Param('id') id: string) {
    return this.strategicRisksService.remove(id);
  }
}
