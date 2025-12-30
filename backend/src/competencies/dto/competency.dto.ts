// create-competency.dto.ts
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, Max } from 'class-validator';
import { CompetencyCategory } from '../../entities/competency.entity';

export class CreateCompetencyDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(CompetencyCategory)
    @IsOptional()
    category?: CompetencyCategory;

    @IsInt()
    @Min(1)
    @Max(10)
    @IsOptional()
    maxLevel?: number;
}

export class CreateJobRoleDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    department?: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateCompetencyRequirementDto {
    @IsNotEmpty()
    @IsString()
    jobRoleId: string;

    @IsNotEmpty()
    @IsString()
    competencyId: string;

    @IsInt()
    @Min(1)
    requiredLevel: number;
}

export class RateEmployeeSkillDto {
    @IsNotEmpty()
    @IsString()
    employeeId: string;

    @IsNotEmpty()
    @IsString()
    competencyId: string;

    @IsInt()
    @Min(1)
    currentLevel: number;
}

export class CreateTrainingProgramDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    provider?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    targetCompetencyId?: string;

    @IsOptional()
    @IsString()
    duration?: string;
}

export class AssignTrainingPlanDto {
    @IsNotEmpty()
    @IsString()
    employeeId: string;

    @IsNotEmpty()
    @IsString()
    trainingProgramId: string;

    @IsOptional()
    @IsString()
    dueDate?: string;
}

export class UpdateTrainingStatusDto {
    @IsNotEmpty()
    @IsEnum(['Assigned', 'In Progress', 'Completed', 'Overdue'])
    status: string;

    @IsOptional()
    @IsString()
    completionDate?: string;
}
