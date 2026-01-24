import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { Equipment } from '../entities/equipment.entity';
import { CalibrationHistory } from '../entities/calibration-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Equipment, CalibrationHistory])],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
