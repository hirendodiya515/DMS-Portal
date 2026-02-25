import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { HiraRisk } from '../../entities/hira-risk.entity';
import { RiskAssessmentItem } from '../../entities/risk-assessment-item.entity';
import { User } from '../../entities/user.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { CreateHiraRiskDto, UpdateHiraRiskDto, ReviewHiraRiskDto } from './dto/hira-risks.dto';
import { BaseRisksService } from '../base-risks.service';

@Injectable()
export class HiraRisksService extends BaseRisksService<HiraRisk> {
  constructor(
    @InjectRepository(HiraRisk)
    riskRepository: Repository<HiraRisk>,
    @InjectRepository(RiskAssessmentItem)
    itemRepository: Repository<RiskAssessmentItem>,
    @InjectRepository(User)
    userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    auditLogRepository: Repository<AuditLog>,
  ) {
    super(riskRepository, itemRepository, userRepository, auditLogRepository, 'H', 'hiraRiskId');
  }

  async findAll(filters?: { status?: string; level?: string; department?: string; search?: string }): Promise<HiraRisk[]> {
    return super.findAll(filters, ['risk.activity', 'risk.task', 'risk.location']);
  }

  async getAllHistory(): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { hiraRiskId: Not(IsNull()) },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: 50,
    });
  }

  async getHistory(id: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { hiraRiskId: id },
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  // Specialized overrides if needed (e.g., if HIRA approve/reject needs extra steps)
  async approve(id: string, reviewDto: ReviewHiraRiskDto, userId?: string): Promise<HiraRisk> {
    return super.approve(id, reviewDto.reviewComments || '', userId);
  }

  async reject(id: string, reviewDto: ReviewHiraRiskDto, userId?: string): Promise<HiraRisk> {
    return super.reject(id, reviewDto.reviewComments || '', userId);
  }
}
