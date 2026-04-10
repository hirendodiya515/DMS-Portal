import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray, ArrayMaxSize, IsUUID } from 'class-validator';

export class CreateProcessDeviationDto {
    @IsString()
    @IsNotEmpty()
    line: string;

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @IsString()
    @IsNotEmpty()
    parameterUnderDeviation: string; // Parameter Under Deviation

    @IsString()
    @IsNotEmpty()
    parameterSpecification: string; // Specification of Parameter

    @IsString()
    @IsNotEmpty()
    natureOfDeviation: string;

    @IsString()
    @IsNotEmpty()
    detailsOfDeviation: string;

    @IsString()
    @IsNotEmpty()
    department: string;

    @IsArray()
    @IsUUID('all', { each: true })
    @ArrayMaxSize(3)
    responsiblePersonIds: string[];
}

export class UpdateActionPlanDto {
    @IsOptional()
    @IsString()
    containmentAction?: string;

    @IsOptional()
    @IsString()
    correctiveAction?: string;

    @IsOptional()
    @IsString()
    rootCauseAnalysis?: string;
}

export class ApproveStepDto {
    @IsOptional()
    @IsString()
    remarks?: string;
}
