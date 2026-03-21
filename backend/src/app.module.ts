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
import { RiskAssessmentItem } from './entities/risk-assessment-item.entity';
import { HiraRisk } from './entities/hira-risk.entity';
import { EaaRisk } from './entities/eaa-risk.entity';
import { QraRisk } from './entities/qra-risk.entity';
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
import { Equipment } from './entities/equipment.entity';
import { CalibrationHistory } from './entities/calibration-history.entity';
import { EquipmentModule } from './equipment/equipment.module';
import { SearchModule } from './search/search.module';
import { MailModule } from './mail/mail.module';
import { CalibrationAlertModule } from './calibration-alert/calibration-alert.module';
import { HiraRisksModule } from './risks/hira/hira-risks.module';
import { EaaRisksModule } from './risks/eaa/eaa-risks.module';
import { QraRisksModule } from './risks/qra/qra-risks.module';
import { TrainingCalendar } from './entities/training-calendar.entity';
import { TrainingAttendance } from './entities/training-attendance.entity';
import { TrainingCalendarModule } from './training-calendar/training-calendar.module';

import { ScheduleModule } from '@nestjs/schedule';
import { OrgContextModule } from './org-context/org-context.module';
import { StrategicRisksModule } from './strategic-risks/strategic-risks.module';
import { SwotIssue } from './entities/swot-issue.entity';
import { InterestedParty } from './entities/interested-party.entity';
import { StrategicRisk } from './entities/strategic-risk.entity';
import { Pfmea } from './entities/pfmea.entity';
import { PfmeaWorksheetRow } from './entities/pfmea-worksheet-row.entity';
import { CustomerFeedback } from './entities/customer-feedback.entity';
import { CorrectiveActionRequest } from './entities/corrective-action-request.entity';
import { CustomerFeedbackModule } from './customer-feedback/customer-feedback.module';
import { ProductDeviation } from './entities/product-deviation.entity';
import { ProductDeviationResponsible } from './entities/product-deviation-responsible.entity';
import { ProductDeviationModule } from './product-deviation/product-deviation.module';

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
          Risk, RiskAssessmentItem, HiraRisk, EaaRisk, QraRisk, AuditPlan, AuditParticipant, AuditSchedule, AuditExecution, OrgNode, Flowchart,
          Competency, JobRole, CompetencyRequirement, EmployeeSkill, TrainingProgram, TrainingPlan,
          Equipment, CalibrationHistory,
          TrainingCalendar, TrainingAttendance,
          SwotIssue, InterestedParty, StrategicRisk,
          Pfmea, PfmeaWorksheetRow, CustomerFeedback, CorrectiveActionRequest,
          ProductDeviation, ProductDeviationResponsible
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
    AuditPlansModule,
    AuditParticipantsModule,
    AuditSchedulesModule,
    AuditExecutionsModule,
    AuditLogsModule,
    OrgChartModule,
    FlowchartModule,
    EquipmentModule,
    SearchModule,
    MailModule,
    CalibrationAlertModule,
    HiraRisksModule,
    EaaRisksModule,
    QraRisksModule,
    RisksModule,
    TrainingCalendarModule,
    OrgContextModule,
    StrategicRisksModule,
    CustomerFeedbackModule,
    ProductDeviationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }


