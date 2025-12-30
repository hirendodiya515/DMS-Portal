import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ObjectiveType, ObjectiveStatus, ObjectiveFrequency } from '../../entities/objective.entity';

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
}

export class CreateMeasurementDto {
  @IsNumber()
  actualValue: number;

  @IsString()
  measurementDate: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
