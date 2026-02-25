import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RiskStatus, RiskLevel } from '../../../entities/risk.enums';
import { CreateRiskItemDto, UpdateRiskItemDto } from '../../dto/risks.dto';

export class CreateQraRiskDto {
  @IsString()
  riskCategory: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  process?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRiskItemDto)
  items: CreateRiskItemDto[];

  @IsOptional()
  @IsDateString()
  reviewDate?: string;
}

export class UpdateQraRiskDto {
  @IsOptional()
  @IsString()
  riskCategory?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  process?: string;

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

export class ReviewQraRiskDto {
  @IsOptional()
  @IsString()
  reviewComments?: string;
}
