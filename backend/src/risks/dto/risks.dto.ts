import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RiskType, RiskStatus } from '../../entities/risk.entity';

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

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  hazard?: string;

  @IsOptional()
  @IsString()
  risk?: string;

  @IsOptional()
  @IsString()
  aspect?: string;

  @IsOptional()
  @IsString()
  impact?: string;

  @IsOptional()
  @IsString()
  failureMode?: string;

  @IsOptional()
  @IsString()
  potentialImpact?: string;

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

  // Residual risk (optional)
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
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  hazardRisk?: string;

  @IsOptional()
  @IsString()
  aspectImpact?: string;

  @IsOptional()
  @IsString()
  failureMode?: string;

  @IsOptional()
  @IsString()
  potentialImpact?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  likelihood?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  severity?: number;

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
