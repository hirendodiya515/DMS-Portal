import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MocController } from './moc.controller';
import { MocService } from './moc.service';
import { MocRecord } from '../entities/moc-record.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { DocumentsModule } from '../documents/documents.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MocRecord, AuditLog]),
        DocumentsModule,
    ],
    controllers: [MocController],
    providers: [MocService],
    exports: [MocService],
})
export class MocModule {}
