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

    @IsString()
    @IsOptional()
    initiatorName?: string;

    @IsNumber()
    @IsOptional()
    quantityUnderDeviationPcs?: number;

    @IsArray()
    @IsOptional()
    attachments?: { name: string; fileData: string }[];
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

    @IsString()
    @IsOptional()
    disposalAction?: string;

    @IsArray()
    @IsOptional()
    attachments?: { name: string; fileData: string }[];
}

export class AddMarketingRemarkDto {
    @IsString()
    @IsNotEmpty()
    marketingRemarks: string;

    @IsArray()
    @IsOptional()
    attachments?: { name: string; fileData: string }[];
}

export class ApprovePlantHeadDto {
    @IsString()
    @IsOptional()
    plantHeadRemarks?: string;

    @IsArray()
    @IsOptional()
    attachments?: { name: string; fileData: string }[];
}

export class ApproveCeoDto {
    @IsString()
    @IsOptional()
    ceoRemarks?: string;

    @IsArray()
    @IsOptional()
    attachments?: { name: string; fileData: string }[];
}

export class ApproveQualityHeadDto {
    @IsString()
    @IsOptional()
    qualityHeadRemarks?: string;

    @IsArray()
    @IsOptional()
    attachments?: { name: string; fileData: string }[];
}

export class UpdateDeviationQuantityDto {
    @IsNumber()
    @IsNotEmpty()
    totalQuantityProduced: number;

    @IsNumber()
    @IsNotEmpty()
    quantityUnderDeviation: number;

    @IsNumber()
    @IsOptional()
    quantityUnderDeviationPcs?: number;
}

