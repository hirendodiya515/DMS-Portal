import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { QraRisk } from '../../entities/qra-risk.entity';
import { RiskAssessmentItem } from '../../entities/risk-assessment-item.entity';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { CreateQraRiskDto, UpdateQraRiskDto, ReviewQraRiskDto } from './dto/qra-risks.dto';
import { BaseRisksService } from '../base-risks.service';

@Injectable()
export class QraRisksService extends BaseRisksService<QraRisk> {
  constructor(
    @InjectRepository(QraRisk)
    riskRepository: Repository<QraRisk>,
    @InjectRepository(RiskAssessmentItem)
    itemRepository: Repository<RiskAssessmentItem>,
    @InjectRepository(User)
    userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    auditLogRepository: Repository<AuditLog>,
  ) {
    super(riskRepository, itemRepository, userRepository, auditLogRepository, 'Q', 'qraRiskId');
  }

  async findAll(filters?: { status?: string; level?: string; department?: string; search?: string }): Promise<QraRisk[]> {
    return super.findAll(filters, ['risk.riskCategory', 'risk.process', 'risk.riskNumber']);
  }

  async getAllHistory(): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { qraRiskId: Not(IsNull()) },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: 50,
    });
  }

  async getHistory(id: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { qraRiskId: id },
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async approve(id: string, reviewDto: ReviewQraRiskDto, userId?: string): Promise<QraRisk> {
    return super.approve(id, reviewDto.reviewComments || '', userId);
  }

  async reject(id: string, reviewDto: ReviewQraRiskDto, userId?: string): Promise<QraRisk> {
    return super.reject(id, reviewDto.reviewComments || '', userId);
  }
}
