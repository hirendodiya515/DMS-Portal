import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.CREATOR, UserRole.DEPT_HEAD, UserRole.REVIEWER)
    create(@Body() createDocumentDto: any, @Request() req: any) {
        return this.documentsService.create(createDocumentDto, req.user.userId);
    }

    @Get()
    findAll(@Query() filters: any) {
        return this.documentsService.findAll(filters);
    }

    @Get('stats')
    getDashboardStats() {
        return this.documentsService.getDashboardStats();
    }

    @Get('reports/stats')
    @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_MANAGER)
    async getReports() {
        return this.documentsService.getReportStats();
    }

    @Get('department-stats')
    async getDepartmentStats() {
        return this.documentsService.getDepartmentStats();
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.documentsService.findOne(id, req.user.userId);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.CREATOR, UserRole.DEPT_HEAD, UserRole.REVIEWER)
    update(@Param('id') id: string, @Body() updateDocumentDto: any, @Request() req: any) {
        return this.documentsService.update(id, updateDocumentDto, req.user);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string, @Request() req: any) {
        return this.documentsService.remove(id, req.user.userId);
    }

    @Post(':id/submit')
    @Roles(UserRole.ADMIN, UserRole.CREATOR, UserRole.DEPT_HEAD, UserRole.REVIEWER)
    submit(@Param('id') id: string, @Request() req: any) {
        return this.documentsService.submit(id, req.user.userId);
    }

    @Post(':id/approve')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.COMPLIANCE_MANAGER)
    approve(@Param('id') id: string, @Body() body: { comments?: string }, @Request() req: any) {
        return this.documentsService.approve(id, req.user.userId, body.comments);
    }

    @Post(':id/reject')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.COMPLIANCE_MANAGER)
    reject(@Param('id') id: string, @Body() body: { comments: string }, @Request() req: any) {
        return this.documentsService.reject(id, req.user.userId, body.comments);
    }

    @Get(':id/versions')
    getVersions(@Param('id') id: string, @Request() req: any) {
        return this.documentsService.getVersions(id, req.user);
    }
}
