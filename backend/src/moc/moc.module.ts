import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MocController } from './moc.controller';
import { MocService } from './moc.service';
import { MocRecord } from '../entities/moc-record.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { DocumentsModule } from '../documents/documents.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MocRecord, AuditLog, User]),
        DocumentsModule,
        SettingsModule,
    ],
    controllers: [MocController],
    providers: [MocService],
    exports: [MocService],
})
export class MocModule {}
