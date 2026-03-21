import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateProductDeviationDto {
    @IsString()
    @IsNotEmpty()
    line: string;

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @IsNumber()
    @IsNotEmpty()
    totalQuantityProduced: number;

    @IsNumber()
    @IsNotEmpty()
    quantityUnderDeviation: number;

    @IsString()
    @IsNotEmpty()
    natureOfDeviation: string;

    @IsString()
    @IsNotEmpty()
    detailsOfDeviation: string;


    @IsArray()
    @IsUUID('all', { each: true })
    @IsNotEmpty()
    responsiblePersonIds: string[];
}

export class UpdateActionPlanDto {
    @IsString()
    @IsOptional()
    containmentAction?: string;

    @IsString()
    @IsOptional()
    correctiveAction?: string;

    @IsString()
    @IsOptional()
    rootCauseAnalysis?: string;
}

export class AddMarketingRemarkDto {
    @IsString()
    @IsNotEmpty()
    marketingRemarks: string;
}

export class ApprovePlantHeadDto {
    @IsString()
    @IsOptional()
    plantHeadRemarks?: string;
}

export class ApproveQualityHeadDto {
    @IsString()
    @IsOptional()
    qualityHeadRemarks?: string;
}
