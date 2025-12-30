import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Notification } from './entities/notification.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { Objective } from './entities/objective.entity';
import { ObjectiveMeasurement } from './entities/objective-measurement.entity';
import { Risk } from './entities/risk.entity';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { FilesModule } from './files/files.module';

import { CompetenciesModule } from './competencies/competencies.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { ObjectivesModule } from './objectives/objectives.module';
import { RisksModule } from './risks/risks.module';
import { AuditPlansModule } from './audit-plans/audit-plans.module';
import { AuditParticipantsModule } from './audit-participants/audit-participants.module';
import { AuditSchedulesModule } from './audit-schedules/audit-schedules.module';
import { AuditExecutionsModule } from './audit-executions/audit-executions.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditPlan } from './entities/audit-plan.entity';
import { AuditParticipant } from './entities/audit-participant.entity';
import { AuditSchedule } from './entities/audit-schedule.entity';
import { AuditExecution } from './entities/audit-execution.entity';
import { OrgChartModule } from './org-chart/org-chart.module';
import { OrgNode } from './entities/org-node.entity';
import { Flowchart } from './entities/flowchart.entity';
import { FlowchartModule } from './flowchart/flowchart.module';
import { Competency } from './entities/competency.entity';
import { JobRole } from './entities/job-role.entity';
import { CompetencyRequirement } from './entities/competency-requirement.entity';
import { EmployeeSkill } from './entities/employee-skill.entity';
import { TrainingProgram } from './entities/training-program.entity';
import { TrainingPlan } from './entities/training-plan.entity';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [
          User, Document, DocumentVersion, AuditLog, Notification, SystemSetting, Objective, ObjectiveMeasurement, 
          Risk, AuditPlan, AuditParticipant, AuditSchedule, AuditExecution, OrgNode, Flowchart,
          Competency, JobRole, CompetencyRequirement, EmployeeSkill, TrainingProgram, TrainingPlan
        ],
        synchronize: true, // Set to false in production
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    DocumentsModule,
    FilesModule,

    CompetenciesModule,
    UsersModule,
    NotificationsModule,
    SettingsModule,
    ObjectivesModule,
    RisksModule,
    AuditPlansModule,
    AuditParticipantsModule,
    AuditSchedulesModule,
    AuditExecutionsModule,
    AuditLogsModule,
    OrgChartModule,
    FlowchartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }


