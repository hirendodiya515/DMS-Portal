import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerFeedback } from '../entities/customer-feedback.entity';
import { CorrectiveActionRequest } from '../entities/corrective-action-request.entity';
import { CustomerFeedbackController } from './customer-feedback.controller';
import { CustomerFeedbackService } from './customer-feedback.service';
import { NeonSyncService } from './neon-sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerFeedback, CorrectiveActionRequest])],
  controllers: [CustomerFeedbackController],
  providers: [CustomerFeedbackService, NeonSyncService],
  exports: [CustomerFeedbackService, NeonSyncService],
})
export class CustomerFeedbackModule {}
