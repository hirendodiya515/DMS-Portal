import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RiskStatus, RiskLevel } from '../../../entities/risk.enums';
import { CreateRiskItemDto, UpdateRiskItemDto } from '../../dto/risks.dto';

export class CreateHiraRiskDto {
  @IsString()
  activity: string;

  @IsOptional()
  @IsString()
  task?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  identificationDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRiskItemDto)
  items: CreateRiskItemDto[];

  @IsOptional()
  @IsDateString()
  reviewDate?: string;
}

export class UpdateHiraRiskDto {
  @IsOptional()
  @IsString()
  activity?: string;

  @IsOptional()
  @IsString()
  task?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  identificationDate?: string;

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

export class ReviewHiraRiskDto {
  @IsOptional()
  @IsString()
  reviewComments?: string;
}
