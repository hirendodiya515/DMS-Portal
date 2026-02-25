import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { EaaRisk } from '../../entities/eaa-risk.entity';
import { RiskAssessmentItem } from '../../entities/risk-assessment-item.entity';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { CreateEaaRiskDto, UpdateEaaRiskDto, ReviewEaaRiskDto } from './dto/eaa-risks.dto';
import { BaseRisksService } from '../base-risks.service';

@Injectable()
export class EaaRisksService extends BaseRisksService<EaaRisk> {
  constructor(
    @InjectRepository(EaaRisk)
    riskRepository: Repository<EaaRisk>,
    @InjectRepository(RiskAssessmentItem)
    itemRepository: Repository<RiskAssessmentItem>,
    @InjectRepository(User)
    userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    auditLogRepository: Repository<AuditLog>,
  ) {
    super(riskRepository, itemRepository, userRepository, auditLogRepository, 'E', 'eaaRiskId');
  }

  async findAll(filters?: { status?: string; level?: string; department?: string; search?: string }): Promise<EaaRisk[]> {
    return super.findAll(filters, ['risk.process', 'risk.area', 'risk.riskNumber']);
  }

  async getAllHistory(): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { eaaRiskId: Not(IsNull()) },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: 50,
    });
  }

  async getHistory(id: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { eaaRiskId: id },
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async approve(id: string, reviewDto: ReviewEaaRiskDto, userId?: string): Promise<EaaRisk> {
    return super.approve(id, reviewDto.reviewComments || '', userId);
  }

  async reject(id: string, reviewDto: ReviewHiraRiskDto, userId?: string): Promise<EaaRisk> {
    return super.reject(id, reviewDto.reviewComments || '', userId);
  }
}
import { ReviewHiraRiskDto } from '../hira/dto/hira-risks.dto'; // Import for consistency or use common
