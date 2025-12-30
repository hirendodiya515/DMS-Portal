import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { DocumentVersion } from '../entities/document-version.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { DocumentsModule } from '../documents/documents.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DocumentVersion, AuditLog]),
        MulterModule.register({
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB
            },
        }),
        DocumentsModule,
    ],
    controllers: [FilesController],
    providers: [FilesService],
    exports: [FilesService],
})
export class FilesModule { }
