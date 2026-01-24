import { IsString, IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { EquipmentStatus } from '../../entities/equipment.entity';

export class CreateEquipmentDto {
  @IsString()
  name: string;

  @IsString()
  equipmentId: string;

  @IsString()
  make: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  line?: string;

  @IsString()
  location: string;

  @IsString()
  department: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  lastCalibrationDate?: string;

  @IsDateString()
  nextCalibrationDate: string;

  @IsInt()
  @Min(1)
  calibrationFrequency: number;

  @IsEnum(EquipmentStatus)
  @IsOptional()
  status?: EquipmentStatus;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  alertDaysBeforeDue?: number;
}

export class UpdateEquipmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  equipmentId?: string;

  @IsString()
  @IsOptional()
  make?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  line?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  lastCalibrationDate?: string;

  @IsDateString()
  @IsOptional()
  nextCalibrationDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  calibrationFrequency?: number;

  @IsEnum(EquipmentStatus)
  @IsOptional()
  status?: EquipmentStatus;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  alertDaysBeforeDue?: number;
}

export class CreateCalibrationHistoryDto {
  @IsDateString()
  calibrationDate: string;

  @IsString()
  certificateNumber: string;

  @IsString()
  certifiedBy: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  certificatePath?: string;

  @IsDateString()
  nextCalibrationDate: string;
}
