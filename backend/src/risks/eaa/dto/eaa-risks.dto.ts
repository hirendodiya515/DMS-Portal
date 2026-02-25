import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RiskStatus, RiskLevel } from '../../../entities/risk.enums';
import { CreateRiskItemDto, UpdateRiskItemDto } from '../../dto/risks.dto';

export class CreateEaaRiskDto {
  @IsString()
  process: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRiskItemDto)
  items: CreateRiskItemDto[];

  @IsOptional()
  @IsDateString()
  reviewDate?: string;
}

export class UpdateEaaRiskDto {
  @IsOptional()
  @IsString()
  process?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  area?: string;

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

export class ReviewEaaRiskDto {
  @IsOptional()
  @IsString()
  reviewComments?: string;
}
