import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, UseGuards, Request, Res, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { DocumentsService } from '../documents/documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename="${fileName}"`,
        });

        res.send(buffer);
    }
}
