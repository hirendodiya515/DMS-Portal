import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { AiAuditBriefingService } from './ai-audit-briefing.service';
import { AiAuditBriefingController } from './ai-audit-briefing.controller';

import { Document } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { Equipment } from '../entities/equipment.entity';
import { AuditPlan } from '../entities/audit-plan.entity';
import { AuditSchedule } from '../entities/audit-schedule.entity';
import { AuditExecution } from '../entities/audit-execution.entity';
import { Risk } from '../entities/risk.entity';
import { OrgNode } from '../entities/org-node.entity';
import { Objective } from '../entities/objective.entity';
import { SwotIssue } from '../entities/swot-issue.entity';
import { ProductDeviation } from '../entities/product-deviation.entity';
import { ProcessDeviation } from '../entities/process-deviation.entity';
import { MocRecord } from '../entities/moc-record.entity';
import { AuditParticipant } from '../entities/audit-participant.entity';
import { HiraRisk } from '../entities/hira-risk.entity';
import { EaaRisk } from '../entities/eaa-risk.entity';
import { QraRisk } from '../entities/qra-risk.entity';
import { InterestedParty } from '../entities/interested-party.entity';
import { SystemSetting } from '../entities/system-setting.entity';

@Module({
    imports: [
        HttpModule,
        TypeOrmModule.forFeature([
            Document, 
            DocumentVersion,
            Equipment, 
            AuditPlan, 
            AuditSchedule, 
            AuditExecution,
            Risk, 
            OrgNode,
            Objective,
            SwotIssue,
            ProductDeviation,
            ProcessDeviation,
            MocRecord,
            AuditParticipant,
            HiraRisk,
            EaaRisk,
            QraRisk,
            InterestedParty,
            SystemSetting
        ]),
    ],
    controllers: [AiController, AiAuditBriefingController],
    providers: [AiService, KnowledgeBaseService, AiAuditBriefingService],
    exports: [AiService, KnowledgeBaseService, AiAuditBriefingService],
})
export class AiModule {}
