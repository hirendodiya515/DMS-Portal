import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessDeviationService } from './process-deviation.service';
import { ProcessDeviationController } from './process-deviation.controller';
import { ProcessDeviation } from '../entities/process-deviation.entity';
import { ProcessDeviationResponsible } from '../entities/process-deviation-responsible.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ProcessDeviation, ProcessDeviationResponsible, User, AuditLog, SystemSetting]),
        MailModule,
    ],
    providers: [ProcessDeviationService],
    controllers: [ProcessDeviationController],
    exports: [ProcessDeviationService],
})
export class ProcessDeviationModule {}
