import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DocumentVersion } from '../entities/document-version.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

@Injectable()
export class FilesService {
    private uploadPath: string;

    constructor(
        @InjectRepository(DocumentVersion)
        private versionRepository: Repository<DocumentVersion>,
        @InjectRepository(AuditLog)
        private auditRepository: Repository<AuditLog>,
        private configService: ConfigService,
    ) {
        this.uploadPath = this.configService.get('UPLOAD_PATH') || './uploads';
        this.ensureUploadDirectory();
    }

    private async ensureUploadDirectory() {
        try {
            await mkdir(this.uploadPath, { recursive: true });
        } catch (error) {
            // Directory already exists
        }
    }

    async uploadFile(
        file: Express.Multer.File,
        documentId: string,
        userId: string,
        changeNotes?: string,
        effectiveDate?: Date,
    ): Promise<DocumentVersion> {
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(this.uploadPath, fileName);

        await writeFile(filePath, file.buffer);

        const version = this.versionRepository.create({
            documentId,
            fileName: file.originalname,
            filePath,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedBy: userId,
            changeNotes,
            effectiveDate,
            versionNumber: 1, // Will be updated by DocumentsService
        });

        const savedVersion = await this.versionRepository.save(version);

        await this.logAction(AuditAction.CREATE, userId, documentId, `File uploaded: ${file.originalname}`);

        return savedVersion;
    }

    async downloadFile(versionId: string, userId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
        const version = await this.versionRepository.findOne({ where: { id: versionId } });

        if (!version) {
            throw new Error('File not found');
        }

        const buffer = await readFile(version.filePath);

        await this.logAction(AuditAction.DOWNLOAD, userId, version.documentId, `File downloaded: ${version.fileName}`);

        return {
            buffer,
            fileName: version.fileName,
            mimeType: version.mimeType,
        };
    }

    async deleteFile(versionId: string): Promise<void> {
        const version = await this.versionRepository.findOne({ where: { id: versionId } });

        if (!version) {
            throw new Error('File not found');
        }

        try {
            await unlink(version.filePath);
        } catch (error) {
            // File already deleted or doesn't exist
        }

        await this.versionRepository.remove(version);
    }

    private async logAction(action: AuditAction, userId: string, documentId: string, details: string) {
        const log = this.auditRepository.create({
            action,
            userId,
            documentId,
            details,
        });
        await this.auditRepository.save(log);
    }
}
