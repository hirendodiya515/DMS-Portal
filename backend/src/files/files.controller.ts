import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, UseGuards, Request, Res, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { DocumentsService } from '../documents/documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
    constructor(
        private readonly filesService: FilesService,
        private readonly documentsService: DocumentsService,
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { documentId: string; changeNotes?: string; effectiveDate?: string },
        @Request() req: any,
    ) {
        const version = await this.filesService.uploadFile(
            file,
            body.documentId,
            req.user.userId,
            body.changeNotes,
            body.effectiveDate ? new Date(body.effectiveDate) : undefined,
        );

        // Update document's current version
        await this.documentsService.createVersion(body.documentId, version);

        return version;
    }

    @Post('upload-generic')
    @UseInterceptors(FileInterceptor('file'))
    async uploadGenericFile(
        @UploadedFile() file: Express.Multer.File,
    ) {
        const path = await this.filesService.storeFile(file);
        return { path };
    }

    @Public()
    @Get('uploads/:filename')
    async serveFile(
        @Param('filename') filename: string,
        @Res() res: Response,
    ) {
        try {
            const filePath = `uploads/${filename}`;
            const { stream, mimeType, fileName } = await this.filesService.getFileStream(filePath);

            res.set({
                'Content-Type': mimeType,
                'Content-Disposition': `inline; filename="${fileName}"`,
            });

            stream.pipe(res);
        } catch (error) {
            res.status(404).send('File not found');
        }
    }

    @Get(':versionId/download')
    async downloadFile(
        @Param('versionId') versionId: string,
        @Request() req: any,
        @Res() res: Response,
    ) {
        const { buffer, fileName, mimeType } = await this.filesService.downloadFile(versionId, req.user.userId);

        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    }

    @Get(':versionId/preview')
    async previewFile(
        @Param('versionId') versionId: string,
        @Request() req: any,
        @Res() res: Response,
    ) {
        const { buffer, fileName, mimeType } = await this.filesService.downloadFile(versionId, req.user.userId);

        // If it's a Word document, convert it to PDF for preview
        if (mimeType.includes('wordprocessingml') || mimeType.includes('msword') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            try {
                const { buffer: pdfBuffer, fileName: pdfFileName } = await this.filesService.convertToPdf(versionId);
                res.set({
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${pdfFileName}"`,
                    'Content-Length': pdfBuffer.length,
                });
                return res.send(pdfBuffer);
            } catch (error) {
                console.error('Conversion failed, falling back to original file:', error);
                // Fallback to original file if conversion fails
            }
        }

        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename="${fileName}"`,
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    }
}
