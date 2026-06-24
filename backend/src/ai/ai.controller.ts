import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Get } from '@nestjs/common';
import * as express from 'express';
import { AiService } from './ai.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class ChatDto {
    @IsString()
    @IsNotEmpty()
    message: string;

    @IsString()
    @IsOptional()
    context?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly kbService: KnowledgeBaseService,
    ) {}

    @Post('chat')
    @HttpCode(HttpStatus.OK)
    async chat(@Body() chatDto: ChatDto, @Res() res: express.Response) {
        const { message, context } = chatDto;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        try {
            await this.aiService.chatStream(message, context || '', (chunk: string) => {
                res.write(chunk);
            });
        } catch (err) {
            res.write(`⚠️ Connection Error: ${err.message}`);
        } finally {
            res.end();
        }
    }

    @Post('reindex')
    @HttpCode(HttpStatus.OK)
    async reindex() {
        return this.kbService.rebuildIndex();
    }

    @Get('model')
    @HttpCode(HttpStatus.OK)
    async getModel() {
        return { model: this.aiService.getModelName() };
    }
}
