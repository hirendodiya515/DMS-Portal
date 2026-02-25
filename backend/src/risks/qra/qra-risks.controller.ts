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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { QraRisksService } from './qra-risks.service';
import { CreateQraRiskDto, UpdateQraRiskDto, ReviewQraRiskDto } from './dto/qra-risks.dto';

@Controller('risks/qra')
@UseGuards(JwtAuthGuard)
export class QraRisksController {
  constructor(private readonly risksService: QraRisksService) {}

  @Post()
  create(@Body() createDto: CreateQraRiskDto, @Request() req) {
    return this.risksService.create(createDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('level') level?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    return this.risksService.findAll({ status, level, department, search });
  }

  @Get('dashboard')
  getDashboard() {
    return this.risksService.getDashboard();
  }

  @Get('all-history')
  getAllHistory() {
    return this.risksService.getAllHistory();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.risksService.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.risksService.getHistory(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateQraRiskDto, @Request() req) {
    return this.risksService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.risksService.remove(id, req.user.userId);
  }

  @Post(':id/submit')
  submitForReview(@Param('id') id: string, @Request() req) {
    return this.risksService.submitForReview(id, req.user.userId);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() reviewDto: ReviewQraRiskDto, @Request() req) {
    return this.risksService.approve(id, reviewDto, req.user.userId);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() reviewDto: ReviewQraRiskDto, @Request() req) {
    return this.risksService.reject(id, reviewDto, req.user.userId);
  }
}
