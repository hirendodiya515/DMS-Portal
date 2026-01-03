import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DocumentVersion } from '../entities/document-version.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const execAsync = promisify(exec);

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

    async convertToPdf(versionId: string): Promise<{ buffer: Buffer; fileName: string }> {
        const version = await this.versionRepository.findOne({ where: { id: versionId } });

        if (!version) {
            throw new Error('File not found');
        }

        const inputPath = path.resolve(version.filePath);
        const fileNameWithoutExt = path.parse(version.fileName).name;
        const pdfFileName = `${path.parse(version.filePath).name}.pdf`;
        const outputPath = path.resolve(path.join(this.uploadPath, pdfFileName));

        // Check if PDF already exists (cache)
        if (fs.existsSync(outputPath)) {
            const buffer = await readFile(outputPath);
            return {
                buffer,
                fileName: `${fileNameWithoutExt}.pdf`,
            };
        }

        // Create a temporary VBScript for conversion
        const vbsPath = path.join(this.uploadPath, `convert-${Date.now()}.vbs`);
        const vbsScript = `
Set objWord = CreateObject("Word.Application")
objWord.Visible = False
Set objDoc = objWord.Documents.Open("${inputPath.replace(/\\/g, '\\\\')}")
objDoc.SaveAs "${outputPath.replace(/\\/g, '\\\\')}", 17
objDoc.Close
objWord.Quit
Set objDoc = Nothing
Set objWord = Nothing
        `;

        try {
            await writeFile(vbsPath, vbsScript);
            
            // Run VBScript using cscript
            await execAsync(`cscript.exe //NoLogo "${vbsPath}"`);
            
            if (!fs.existsSync(outputPath)) {
                throw new Error('PDF was not created by VBScript');
            }

            const buffer = await readFile(outputPath);
            
            // Cleanup VBScript
            await unlink(vbsPath).catch(() => {});

            return {
                buffer,
                fileName: `${fileNameWithoutExt}.pdf`,
            };
        } catch (error) {
            console.error('Word to PDF conversion failed via VBS:', error);
            // Cleanup VBScript on error
            if (fs.existsSync(vbsPath)) {
                await unlink(vbsPath).catch(() => {});
            }
            throw new Error('Failed to convert document for preview');
        }
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
