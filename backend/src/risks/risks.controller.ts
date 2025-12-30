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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RisksService } from './risks.service';
import { CreateRiskDto, UpdateRiskDto, ReviewRiskDto } from './dto/risks.dto';

@Controller('risks')
@UseGuards(JwtAuthGuard)
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  // ================== CRUD ==================

  @Post()
  create(@Body() createDto: CreateRiskDto, @Request() req) {
    return this.risksService.create(createDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('level') level?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    return this.risksService.findAll({ type, status, level, department, search });
  }

  @Get('dashboard')
  getDashboard(@Query('type') type?: string) {
    return this.risksService.getDashboard({ type });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.risksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateRiskDto) {
    return this.risksService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.risksService.remove(id);
  }

  // ================== WORKFLOW ==================

  @Post(':id/submit')
  submitForReview(@Param('id') id: string) {
    return this.risksService.submitForReview(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() reviewDto: ReviewRiskDto) {
    return this.risksService.approve(id, reviewDto);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() reviewDto: ReviewRiskDto) {
    return this.risksService.reject(id, reviewDto);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() reviewDto: ReviewRiskDto) {
    return this.risksService.close(id, reviewDto);
  }
}
