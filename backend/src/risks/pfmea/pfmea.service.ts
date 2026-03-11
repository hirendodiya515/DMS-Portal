import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pfmea } from '../../entities/pfmea.entity';
import { PfmeaWorksheetRow } from '../../entities/pfmea-worksheet-row.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { CreatePfmeaDto } from './dto/create-pfmea.dto';
import { UpdatePfmeaDto } from './dto/update-pfmea.dto';
import { CreatePfmeaWorksheetRowDto } from './dto/create-pfmea-worksheet-row.dto';
import { UpdatePfmeaWorksheetRowDto } from './dto/update-pfmea-worksheet-row.dto';
import { RiskLevel } from '../../entities/risk.enums';
import { User } from '../../entities/user.entity';

@Injectable()
export class PfmeaService {
  constructor(
    @InjectRepository(Pfmea)
    private readonly pfmeaRepo: Repository<Pfmea>,
    @InjectRepository(PfmeaWorksheetRow)
    private readonly pfmeaRowRepo: Repository<PfmeaWorksheetRow>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  private calculateRiskLevel(rpn: number): RiskLevel {
    if (rpn >= 60) return RiskLevel.CRITICAL;
    if (rpn >= 30) return RiskLevel.HIGH;
    if (rpn >= 15) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  // CREATE PFMEA PROJECT
  async createPfmea(createDto: CreatePfmeaDto, user: User): Promise<Pfmea> {
    const pfmea = this.pfmeaRepo.create({
      ...createDto,
      ownerId: createDto.ownerId || user.id,
    });
    
    const saved = await this.pfmeaRepo.save(pfmea);

    const log = this.auditLogRepo.create({
      action: AuditAction.CREATE,
      userId: user.id,
      pfmeaId: saved.id,
      details: `Created PFMEA Project: ${saved.projectName}`,
    });
    await this.auditLogRepo.save(log);

    return saved;
  }

  // GET ALL
  async findAll(): Promise<Pfmea[]> {
    return this.pfmeaRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  // GET ONE
  async findOne(id: string): Promise<Pfmea> {
    const pfmea = await this.pfmeaRepo.findOne({
      where: { id },
      relations: ['worksheetRows', 'auditLogs', 'auditLogs.user']
    });

    if (!pfmea) {
      throw new NotFoundException(`PFMEA with ID ${id} not found`);
    }

    return pfmea;
  }

  // UPDATE PFMEA APP INFO
  async updatePfmea(id: string, updateDto: UpdatePfmeaDto, user: User): Promise<Pfmea> {
    const pfmea = await this.findOne(id);
    Object.assign(pfmea, updateDto);
    
    const saved = await this.pfmeaRepo.save(pfmea);

    const log = this.auditLogRepo.create({
      action: AuditAction.UPDATE,
      userId: user.id,
      pfmeaId: saved.id,
      details: `Updated PFMEA Info: ${pfmea.projectName}`,
    });
    await this.auditLogRepo.save(log);

    return saved;
  }

  // DELETE PFMEA
  async deletePfmea(id: string, user: User): Promise<void> {
    const pfmea = await this.findOne(id);
    await this.pfmeaRepo.remove(pfmea);

    const log = this.auditLogRepo.create({
      action: AuditAction.DELETE,
      userId: user.id,
      pfmeaId: id,
      details: `Deleted PFMEA Project: ${pfmea.projectName}`,
    });
    await this.auditLogRepo.save(log);
  }

  // ==================== WORKSHEET ROW OPERATIONS ====================

  async addRow(pfmeaId: string, rowDto: CreatePfmeaWorksheetRowDto, user: User): Promise<PfmeaWorksheetRow> {
    const pfmea = await this.findOne(pfmeaId);

    // Auto calculate initial RPN
    const severity = rowDto.severity || 1;
    const occurrence = rowDto.occurrence || 1;
    const detection = rowDto.detection || 1;
    const rpn = severity * occurrence * detection;
    const riskLevel = this.calculateRiskLevel(rpn);

    // Auto calculate revised PPN if applicable
    let revisedRpn: number | null = null;
    if (rowDto.postS && rowDto.postO && rowDto.postD) {
      revisedRpn = rowDto.postS * rowDto.postO * rowDto.postD;
    }

    const { id, pfmeaId: _ignore, ...safeDto } = rowDto as any;
    
    const row = new PfmeaWorksheetRow();
    Object.assign(row, safeDto);
    row.pfmeaId = pfmea.id;
    row.severity = severity;
    row.occurrence = occurrence;
    row.detection = detection;
    row.rpn = rpn;
    row.riskLevel = riskLevel;
    row.revisedRpn = revisedRpn;

    const saved = await this.pfmeaRowRepo.save(row);

    const log = this.auditLogRepo.create({
      action: AuditAction.UPDATE,
      userId: user.id,
      pfmeaId,
      details: `Added new row to process step: ${saved.processStep}`,
    });
    await this.auditLogRepo.save(log);

    return saved;
  }

  async updateRow(pfmeaId: string, rowId: string, rowDto: UpdatePfmeaWorksheetRowDto, user: User): Promise<PfmeaWorksheetRow> {
    const row = await this.pfmeaRowRepo.findOne({ where: { id: rowId, pfmeaId } });
    if (!row) {
      throw new NotFoundException(`Worksheet row with ID ${rowId} not found`);
    }

    // Determine if metrics changed before assigning
    const previousRpn = row.rpn;
    const previousSeverity = row.severity;
    const previousOccurrence = row.occurrence;
    const previousDetection = row.detection;

    const { id: _ignoreId, pfmeaId: _ignorePfmea, ...safeDto } = rowDto as any;
    Object.assign(row, safeDto);

    // Auto calculate initial RPN if parameters changed
    row.rpn = row.severity * row.occurrence * row.detection;
    row.riskLevel = this.calculateRiskLevel(row.rpn);

    // Auto calculate revised PPN if applicable
    if (row.postS && row.postO && row.postD) {
      row.revisedRpn = row.postS * row.postO * row.postD;
    }

    const saved = await this.pfmeaRowRepo.save(row);

    let auditDetails = `Updated row for process step: ${saved.processStep}.`;
    
    // Explicitly note RPN jumps in log
    if(previousRpn !== saved.rpn) {
        auditDetails += ` S/O/D adjusted from [${previousSeverity}/${previousOccurrence}/${previousDetection}] to [${saved.severity}/${saved.occurrence}/${saved.detection}]. RPN changed: ${previousRpn} → ${saved.rpn}.`;
    }

    const log = this.auditLogRepo.create({
      action: AuditAction.UPDATE,
      userId: user.id,
      pfmeaId,
      details: auditDetails,
    });
    await this.auditLogRepo.save(log);

    return saved;
  }

  async deleteRow(pfmeaId: string, rowId: string, user: User): Promise<void> {
    const row = await this.pfmeaRowRepo.findOne({ where: { id: rowId, pfmeaId } });
    if (!row) {
      throw new NotFoundException(`Worksheet row with ID ${rowId} not found`);
    }

    await this.pfmeaRowRepo.remove(row);

    const log = this.auditLogRepo.create({
      action: AuditAction.UPDATE,
      userId: user.id,
      pfmeaId,
      details: `Deleted row: ${row.failureMode} under step ${row.processStep}`,
    });
    await this.auditLogRepo.save(log);
  }
}
