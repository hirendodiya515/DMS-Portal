import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { Document } from '../entities/document.entity';
import { Equipment } from '../entities/equipment.entity';
import { AuditPlan } from '../entities/audit-plan.entity';
import { AuditSchedule } from '../entities/audit-schedule.entity';
import { Risk } from '../entities/risk.entity';
import { OrgNode } from '../entities/org-node.entity';
import { Objective } from '../entities/objective.entity';
import { SwotIssue } from '../entities/swot-issue.entity';
import { ProductDeviation } from '../entities/product-deviation.entity';
import { ProcessDeviation } from '../entities/process-deviation.entity';
import { MocRecord } from '../entities/moc-record.entity';

@Module({
    imports: [
        HttpModule,
        TypeOrmModule.forFeature([
            Document, 
            Equipment, 
            AuditPlan, 
            AuditSchedule, 
            Risk, 
            OrgNode,
            Objective,
            SwotIssue,
            ProductDeviation,
            ProcessDeviation,
            MocRecord
        ]),
    ],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule {}
