import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwotIssue } from '../entities/swot-issue.entity';
import { InterestedParty } from '../entities/interested-party.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { OrgContextLog } from '../entities/org-context-log.entity';
import { OrgContextService } from './org-context.service';
import { OrgContextController } from './org-context.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SwotIssue, InterestedParty, SystemSetting, OrgContextLog])],
  controllers: [OrgContextController],
  providers: [OrgContextService],
})
export class OrgContextModule {}
