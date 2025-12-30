import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditParticipantsService } from './audit-participants.service';
import { AuditParticipantType } from '../entities/audit-participant.entity';

@Controller('audit-participants')
export class AuditParticipantsController {
  constructor(private readonly service: AuditParticipantsService) {}

  @Get()
  findAll(@Query('type') type?: AuditParticipantType) {
    if (type) {
      return this.service.findByType(type);
    }
    return this.service.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: any) {
    // Basic DTO handling
    return this.service.create(body);
  }

  @Post('with-file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/certificates',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(pdf|doc|docx|jpg|jpeg|png)$/)) {
            return cb(new BadRequestException('Only accept pdf, doc, oct, jpg, png'), false);
        }
        cb(null, true);
      },
    }),
  )
  createWithFile(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    // Parse body logic since multipart/form-data sends strings
    const participantData = {
      ...body,
      certificateName: file ? file.originalname : undefined,
      certificatePath: file ? file.path : undefined,
    };
    return this.service.create(participantData);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Get(':id/certificate')
  async getCertificate(@Param('id') id: string, @Res() res: Response) {
    const participant = await this.service.findOne(id);
    if (!participant || !participant.certificatePath) {
      throw new NotFoundException('Certificate not found');
    }

    const filePath = join(process.cwd(), participant.certificatePath);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found on server');
    }

    return res.sendFile(filePath);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
