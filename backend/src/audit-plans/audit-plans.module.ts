import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditPlan } from '../entities/audit-plan.entity';
import { AuditPlansController } from './audit-plans.controller';
import { AuditPlansService } from './audit-plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditPlan])],
  controllers: [AuditPlansController],
  providers: [AuditPlansService],
})
export class AuditPlansModule {}
