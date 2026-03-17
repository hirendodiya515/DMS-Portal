import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomerFeedbackService } from './customer-feedback.service';
import { NeonSyncService } from './neon-sync.service';
import { Public } from '../auth/public.decorator';

@Controller('customer-feedback')
@UseGuards(JwtAuthGuard)
export class CustomerFeedbackController {
  constructor(
    private readonly feedbackService: CustomerFeedbackService,
    private readonly neonSyncService: NeonSyncService,
  ) {}

  // Public endpoint — for Vercel Vite form (fallback if serverless not available)
  @Public()
  @Post()
  create(@Body() data: any) {
    return this.feedbackService.createFeedback(data);
  }

  // Admin — manual sync from NeonDB
  @Post('sync')
  syncFromNeon() {
    return this.neonSyncService.manualSync();
  }

  @Get()
  findAll() {
    return this.feedbackService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.feedbackService.getStats();
  }

  @Get('cars')
  getCars() {
    return this.feedbackService.getCars();
  }
}
