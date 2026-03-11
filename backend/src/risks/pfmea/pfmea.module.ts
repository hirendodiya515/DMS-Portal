import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PfmeaService } from './pfmea.service';
import { PfmeaController } from './pfmea.controller';
import { Pfmea } from '../../entities/pfmea.entity';
import { PfmeaWorksheetRow } from '../../entities/pfmea-worksheet-row.entity';
import { AuditLog } from '../../entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pfmea, PfmeaWorksheetRow, AuditLog])],
  controllers: [PfmeaController],
  providers: [PfmeaService],
  exports: [PfmeaService],
})
export class PfmeaModule {}
