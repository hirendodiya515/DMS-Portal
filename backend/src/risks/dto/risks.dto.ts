import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RiskType, RiskStatus, RiskLevel } from '../../entities/risk.enums';

export class CreateRiskItemDto {
  @IsString()
  hazardOrAspect: string;

  @IsOptional()
  @IsString()
  subActivity?: string;

  @IsOptional()
  @IsString()
  consequenceOrImpact?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  likelihood: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  severity: number;

  @IsOptional()
  @IsString()
  currentControls?: string;

  @IsOptional()
  @IsString()
  proposedActions?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  residualLikelihood?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  residualSeverity?: number;
}

export class UpdateRiskItemDto extends CreateRiskItemDto {
  @IsOptional()
  @IsString()
  id?: string;
}

export class CreateRiskDto {
  @IsEnum(RiskType)
  type: RiskType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  interestedParties?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRiskItemDto)
  items: CreateRiskItemDto[];

  @IsOptional()
  @IsDateString()
  reviewDate?: string;
}

export class UpdateRiskDto {
  @IsOptional()
  @IsEnum(RiskType)
  type?: RiskType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  interestedParties?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRiskItemDto)
  items?: UpdateRiskItemDto[];

  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsString()
  reviewComments?: string;
}

export class ReviewRiskDto {
  @IsOptional()
  @IsString()
  reviewComments?: string;
}
