import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { CompetenciesService } from './competencies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import {
    CreateCompetencyDto,
    CreateJobRoleDto,
    CreateCompetencyRequirementDto,
    RateEmployeeSkillDto,
    CreateTrainingProgramDto,
    AssignTrainingPlanDto,
    UpdateTrainingStatusDto,
} from './dto/competency.dto';

@Controller('competencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompetenciesController {
    constructor(private readonly service: CompetenciesService) {}

    @Post()
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    createCompetency(@Body() dto: CreateCompetencyDto) {
        return this.service.createCompetency(dto);
    }

    @Get()
    findAllCompetencies() {
        return this.service.findAllCompetencies();
    }

    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    updateCompetency(@Param('id') id: string, @Body() dto: CreateCompetencyDto) {
        return this.service.updateCompetency(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    deleteCompetency(@Param('id') id: string) {
        return this.service.deleteCompetency(id);
    }

    @Post('roles')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    createJobRole(@Body() dto: CreateJobRoleDto) {
        return this.service.createJobRole(dto);
    }

    @Get('roles')
    findAllJobRoles() {
        return this.service.findAllJobRoles();
    }

    @Put('roles/:id')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    updateJobRole(@Param('id') id: string, @Body() dto: CreateJobRoleDto) {
        return this.service.updateJobRole(id, dto);
    }

    @Delete('roles/:id')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    deleteJobRole(@Param('id') id: string) {
        return this.service.deleteJobRole(id);
    }

    @Post('requirements')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    addRequirement(@Body() dto: CreateCompetencyRequirementDto) {
        return this.service.addRequirement(dto);
    }

    @Delete('requirements/:roleId/:competencyId')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    deleteRequirement(
        @Param('roleId') roleId: string,
        @Param('competencyId') competencyId: string,
    ) {
        return this.service.deleteRequirement(roleId, competencyId);
    }

    @Get('requirements/:roleId')
    getRequirements(@Param('roleId') roleId: string) {
        return this.service.getRequirementsByRole(roleId);
    }

    @Post('skills')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    rateSkill(@Body() dto: RateEmployeeSkillDto) {
        return this.service.rateSkill(dto);
    }

    @Get('skills/:employeeId')
    getEmployeeSkills(@Param('employeeId') employeeId: string) {
        return this.service.getEmployeeSkills(employeeId);
    }

    @Get('gap-analysis')
    getGapAnalysis(@Query('employeeId') employeeId: string, @Query('roleId') roleId: string) {
        return this.service.getGapAnalysis(employeeId, roleId);
    }

    @Post('training-programs')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    createProgram(@Body() dto: CreateTrainingProgramDto) {
        return this.service.createTrainingProgram(dto);
    }

    @Get('training-programs')
    findAllPrograms() {
        return this.service.findAllPrograms();
    }

    @Post('training-plans')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    assignTraining(@Body() dto: AssignTrainingPlanDto) {
        return this.service.assignTraining(dto);
    }

    @Get('training-plans/:employeeId')
    getUserTrainingPlan(@Param('employeeId') employeeId: string) {
        return this.service.getUserTrainingPlan(employeeId);
    }

    @Put('training-plans/:id/status')
    @Roles(UserRole.ADMIN, UserRole.REVIEWER)
    updateTrainingStatus(@Param('id') id: string, @Body() dto: UpdateTrainingStatusDto) {
        return this.service.updateTrainingStatus(id, dto);
    }

    // --- Summary Endpoints ---

    @Get('summary/departments')
    getDepartmentSummary() {
        return this.service.getDepartmentSummary();
    }

    @Get('summary/department/:dept')
    getDepartmentUserSummary(@Param('dept') dept: string) {
        return this.service.getDepartmentUserSummary(dept);
    }

    @Get('summary/competency-gaps')
    getCompetencyGapSummary() {
        return this.service.getCompetencyGapSummary();
    }
}
