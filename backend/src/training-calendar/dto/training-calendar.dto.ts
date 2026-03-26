import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateTrainingCalendarDto {
  @IsNotEmpty()
  @IsString()
  trainingName: string;

  @IsNotEmpty()
  @IsString()
  trainingDate: string; // "YYYY-MM-DD"

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  startTime?: string; // "09:00"

  @IsOptional()
  @IsString()
  endTime?: string; // "11:00"

  @IsOptional()
  @IsString()
  department?: string;
}

export class UpdateTrainingCalendarDto {
  @IsOptional()
  @IsString()
  trainingName?: string;

  @IsOptional()
  @IsString()
  trainingDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  department?: string;
}
