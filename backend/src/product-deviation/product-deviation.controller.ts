import { Controller, Get, Post, Body, Param, Put, UseGuards, Request, Query } from '@nestjs/common';
import { ProductDeviationService } from './product-deviation.service';
import { CreateProductDeviationDto, UpdateActionPlanDto, AddMarketingRemarkDto, ApprovePlantHeadDto, ApproveQualityHeadDto } from './dto/product-deviation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('product-deviation')
@UseGuards(JwtAuthGuard)
export class ProductDeviationController {
    constructor(private readonly productDeviationService: ProductDeviationService) {}

    @Post()
    create(@Body() createProductDeviationDto: CreateProductDeviationDto, @Request() req) {
        return this.productDeviationService.create(createProductDeviationDto, req.user.userId);
    }

    @Get('summary')
    getSummary() {
        return this.productDeviationService.getSummary();
    }

    @Get()
    findAll() {
        return this.productDeviationService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productDeviationService.findOne(id);
    }

    @Put(':id/action')
    updateActionPlan(@Param('id') id: string, @Body() updateActionPlanDto: UpdateActionPlanDto, @Request() req) {
        return this.productDeviationService.updateActionPlan(id, updateActionPlanDto, req.user.userId);
    }

    @Put(':id/marketing')
    addMarketingRemark(@Param('id') id: string, @Body() addMarketingRemarkDto: AddMarketingRemarkDto, @Request() req) {
        return this.productDeviationService.addMarketingRemark(id, addMarketingRemarkDto, req.user.userId);
    }

    @Put(':id/plant-head')
    approvePlantHead(@Param('id') id: string, @Body() dto: ApprovePlantHeadDto, @Request() req) {
        return this.productDeviationService.approvePlantHead(id, dto, req.user.userId);
    }

    @Put(':id/quality-head')
    approveQualityHead(@Param('id') id: string, @Body() dto: ApproveQualityHeadDto, @Request() req) {
        return this.productDeviationService.approveQualityHead(id, dto, req.user.userId);
    }
}
