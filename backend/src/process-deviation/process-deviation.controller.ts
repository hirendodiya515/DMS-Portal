import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProcessDeviationService } from './process-deviation.service';
import { CreateProcessDeviationDto, UpdateActionPlanDto, ApproveStepDto } from './dto/process-deviation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('process-deviation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcessDeviationController {
    constructor(private readonly processDeviationService: ProcessDeviationService) {}

    @Post()
    create(@Body() createDto: CreateProcessDeviationDto, @Request() req) {
        return this.processDeviationService.create(createDto, req.user.userId);
    }

    @Get()
    findAll() {
        return this.processDeviationService.findAll();
    }

    @Get('summary')
    getSummary() {
        return this.processDeviationService.getSummary();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.processDeviationService.findOne(id);
    }

    @Put(':id/action-plan')
    updateActionPlan(@Param('id') id: string, @Body() dto: UpdateActionPlanDto, @Request() req) {
        return this.processDeviationService.updateActionPlan(id, dto, req.user.userId);
    }

    @Put(':id/approve-functional')
    approveFunctional(@Param('id') id: string, @Body() dto: ApproveStepDto, @Request() req) {
        return this.processDeviationService.approveFunctionalHead(id, dto, req.user.userId);
    }

    @Put(':id/approve-qa')
    approveQA(@Param('id') id: string, @Body() dto: ApproveStepDto, @Request() req) {
        return this.processDeviationService.approveQAHead(id, dto, req.user.userId);
    }

    @Put(':id/approve-plant')
    approvePlant(@Param('id') id: string, @Body() dto: ApproveStepDto, @Request() req) {
        return this.processDeviationService.approvePlantHead(id, dto, req.user.userId);
    }

    @Put(':id/approve-process')
    approveProcess(@Param('id') id: string, @Body() dto: ApproveStepDto, @Request() req) {
        return this.processDeviationService.approveProcessHead(id, dto, req.user.userId);
    }

    @Put(':id/approve-ceo')
    approveCEO(@Param('id') id: string, @Body() dto: ApproveStepDto, @Request() req) {
        return this.processDeviationService.approveCEO(id, dto, req.user.userId);
    }
}
