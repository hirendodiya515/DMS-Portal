import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RisksService } from './risks.service';
import { HiraRisksService } from './hira/hira-risks.service';
import { EaaRisksService } from './eaa/eaa-risks.service';
import { QraRisksService } from './qra/qra-risks.service';

@Controller('risks')
@UseGuards(JwtAuthGuard)
export class RisksController {
  constructor(
    private readonly risksService: RisksService,
    private readonly hiraService: HiraRisksService,
    private readonly eaaService: EaaRisksService,
    private readonly qraService: QraRisksService,
  ) {}

  private getService(type?: string): any {
    switch (type?.toLowerCase()) {
      case 'hira': return this.hiraService;
      case 'eaa': return this.eaaService;
      case 'qra': return this.qraService;
      default: return this.risksService;
    }
  }

  @Post()
  create(@Body() createDto: any, @Request() req) {
    const service = this.getService(createDto.type);
    return service.create(createDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('level') level?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    const service = this.getService(type);
    return service.findAll({ status, level, department, search });
  }

  @Get('dashboard')
  getDashboard(@Query('type') type?: string) {
    const service = this.getService(type);
    return service.getDashboard();
  }

  @Get('all-history')
  getAllHistory(@Query('type') type?: string) {
    const service = this.getService(type);
    return service.getAllHistory();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Query('type') type?: string) {
    const service = this.getService(type);
    return service.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseUUIDPipe) id: string, @Query('type') type?: string) {
    const service = this.getService(type);
    return service.getHistory(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: any, @Request() req) {
    const service = this.getService(updateDto.type);
    return service.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req, @Query('type') type?: string) {
    const service = this.getService(type);
    return service.remove(id, req.user.userId);
  }

  @Post(':id/submit')
  submitForReview(@Param('id', ParseUUIDPipe) id: string, @Request() req, @Query('type') type?: string) {
    const service = this.getService(type);
    return service.submitForReview(id, req.user.userId);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() reviewDto: any, @Request() req) {
    const service = this.getService(reviewDto.type);
    return service.approve(id, reviewDto, req.user.userId);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() reviewDto: any, @Request() req) {
    const service = this.getService(reviewDto.type);
    return service.reject(id, reviewDto, req.user.userId);
  }

  @Post(':id/close')
  close(@Param('id', ParseUUIDPipe) id: string, @Body() reviewDto: any, @Request() req) {
    const service = this.getService(reviewDto.type);
    // Note: specialized services inherit approve/reject but close might need extra handling
    // For now assuming base service approach
    return service.close ? service.close(id, reviewDto, req.user.userId) : service.approve(id, reviewDto, req.user.userId);
  }
}
