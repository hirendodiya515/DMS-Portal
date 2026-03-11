import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { RiskStatus } from '../../../entities/risk.enums';

export class CreatePfmeaDto {
  @IsString()
  @IsNotEmpty()
  pfmeaNumber: string;

  @IsString()
  @IsNotEmpty()
  projectName: string;

  @IsString()
  @IsNotEmpty()
  processName: string;

  @IsString()
  @IsOptional()
  revisionNumber?: string;

  @IsString()
  @IsOptional()
  revisionSummary?: string;

  @IsString()
  @IsOptional()
  revisionDate?: string;

  @IsEnum(RiskStatus)
  @IsOptional()
  status?: RiskStatus;

  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @IsUUID()
  @IsOptional()
  reviewerId?: string;
}
