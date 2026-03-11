import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { RiskLevel } from '../../../entities/risk.enums';

export class CreatePfmeaWorksheetRowDto {
  @IsString()
  @IsNotEmpty()
  processStep: string;

  @IsString()
  @IsOptional()
  processDesc?: string;

  @IsString()
  @IsNotEmpty()
  failureMode: string;

  @IsString()
  @IsOptional()
  effects?: string;

  @IsString()
  @IsOptional()
  effectClass?: string;

  @IsString()
  @IsOptional()
  causes?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  severity?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  occurrence?: number;

  @IsString()
  @IsOptional()
  prevention?: string;

  @IsString()
  @IsOptional()
  detectionControl?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  detection?: number;

  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  responsible?: string;

  @IsString()
  @IsOptional()
  targetDate?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  postS?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  postO?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  postD?: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}
