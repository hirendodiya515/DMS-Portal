import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObjectivesController } from './objectives.controller';
import { ObjectivesService } from './objectives.service';
import { Objective } from '../entities/objective.entity';
import { ObjectiveMeasurement } from '../entities/objective-measurement.entity';
import { Document } from '../entities/document.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Objective, ObjectiveMeasurement, Document, AuditLog]),
  ],
  controllers: [ObjectivesController],
  providers: [ObjectivesService],
  exports: [ObjectivesService],
})
export class ObjectivesModule {}
