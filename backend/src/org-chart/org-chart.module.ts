import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgNode } from '../entities/org-node.entity';
import { OrgChartController } from './org-chart.controller';
import { OrgChartService } from './org-chart.service';

import { AuditLog } from '../entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrgNode, AuditLog])],
  controllers: [OrgChartController],
  providers: [OrgChartService],
})
export class OrgChartModule {}
