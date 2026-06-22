import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
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
    constructor(private readonly aiService: AiService) {}

    @Post('chat')
    @HttpCode(HttpStatus.OK)
    async chat(@Body() chatDto: ChatDto) {
        const { message, context } = chatDto;
        return this.aiService.chat(message, context);
    }
}
