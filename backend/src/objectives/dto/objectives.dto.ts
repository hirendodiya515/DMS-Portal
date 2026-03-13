import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ObjectiveType, ObjectiveStatus, ObjectiveFrequency } from '../../entities/objective.entity';

class SubTargetDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  target: number;
}

class SubValueDto {
  @IsString()
  subTargetId: string;

  @IsNumber()
  value: number;
}

export class CreateObjectiveDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ObjectiveType)
  type: ObjectiveType;

  @IsOptional()
  @IsString()
  department?: string;

  @IsString()
  uom: string; // Unit of Measure from master data

  @IsEnum(ObjectiveFrequency)
  frequency: ObjectiveFrequency;

  @IsNumber()
  target: number;

  @IsOptional()
  @IsBoolean()
  higherIsBetter?: boolean = true;

  @IsOptional()
  @IsBoolean()
  hasSubTargets?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubTargetDto)
  subTargets?: SubTargetDto[];

  @IsOptional()
  @IsString()
  aggregationType?: string;
}

export class UpdateObjectiveDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ObjectiveType)
  type?: ObjectiveType;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(ObjectiveStatus)
  status?: ObjectiveStatus;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsEnum(ObjectiveFrequency)
  frequency?: ObjectiveFrequency;

  @IsOptional()
  @IsNumber()
  target?: number;

  @IsOptional()
  @IsBoolean()
  higherIsBetter?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSubTargets?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubTargetDto)
  subTargets?: SubTargetDto[];

  @IsOptional()
  @IsString()
  aggregationType?: string;
}

export class CreateMeasurementDto {
  @IsNumber()
  actualValue: number;

  @IsString()
  measurementDate: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubValueDto)
  subValues?: SubValueDto[];
}

export class UpdateMeasurementDto {
  @IsOptional()
  @IsNumber()
  actualValue?: number;

  @IsOptional()
  @IsString()
  measurementDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubValueDto)
  subValues?: SubValueDto[];
}
