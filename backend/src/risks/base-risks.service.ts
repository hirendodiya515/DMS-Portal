import { Repository, DeepPartial, FindOptionsWhere } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RiskStatus, RiskLevel, calculateRiskLevel } from '../entities/risk.enums';
import { RiskAssessmentItem } from '../entities/risk-assessment-item.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';

export abstract class BaseRisksService<T extends { id: string, riskNumber: string, status: RiskStatus, maxRiskLevel: RiskLevel, department?: string, reviewerId?: string, ownerId?: string, items?: RiskAssessmentItem[] }> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly itemRepository: Repository<RiskAssessmentItem>,
    protected readonly userRepository: Repository<User>,
    protected readonly auditLogRepository: Repository<AuditLog>,
    protected readonly riskPrefix: string,
    protected readonly riskIdField: string, // e.g., 'hiraRiskId'
  ) {}

  protected getHighestRiskLevel(items: any[]): RiskLevel {
    if (!items || items.length === 0) return RiskLevel.LOW;
    const levels = items.map(item => calculateRiskLevel(item.likelihood * item.severity));
    const priority = { [RiskLevel.CRITICAL]: 4, [RiskLevel.HIGH]: 3, [RiskLevel.MEDIUM]: 2, [RiskLevel.LOW]: 1 };
    return levels.reduce((max, curr) => priority[curr] > priority[max] ? curr : max, RiskLevel.LOW);
  }

  protected async generateRiskNumber(): Promise<string> {
    // Find all existing risk numbers for this prefix, extract the highest numeric suffix,
    // then use max+1. Avoids collision after record deletions (count-based would reuse old numbers).
    const all = await this.repository.find({ select: ['riskNumber'] as any });
    const prefix = this.riskPrefix + '-';
    const maxNum = all.reduce((max, risk: any) => {
      const numStr = risk.riskNumber?.startsWith(prefix)
        ? risk.riskNumber.slice(prefix.length)
        : '0';
      const num = parseInt(numStr, 10) || 0;
      return num > max ? num : max;
    }, 0);
    return `${this.riskPrefix}-${String(maxNum + 1).padStart(3, '0')}`;
  }

  protected async findDepartmentHead(department: string): Promise<User | null> {
    if (!department) return null;
    return this.userRepository.findOne({
      where: { department, role: UserRole.DEPT_HEAD },
    });
  }

  async create(createDto: any, userId: string): Promise<T> {
    const { items, ...riskData } = createDto;
    const maxRiskLevel = this.getHighestRiskLevel(items);

    let reviewerId: string | undefined;
    if (createDto.department) {
      const deptHead = await this.findDepartmentHead(createDto.department);
      if (deptHead) reviewerId = deptHead.id;
    }

    const risk = this.repository.create({
      ...riskData,
      riskNumber: await this.generateRiskNumber(),
      maxRiskLevel,
      ownerId: userId,
      reviewerId,
      status: RiskStatus.DRAFT,
    } as DeepPartial<T>);

    const savedRisk = await this.repository.save(risk);
    (savedRisk as any).items = [];

    if (items && items.length > 0) {
      const assessmentItems = items.map(item => {
        const rating = item.likelihood * item.severity;
        const level = calculateRiskLevel(rating);
        let residualRating: number | undefined;
        let residualLevel: RiskLevel | undefined;
        if (item.residualLikelihood && item.residualSeverity) {
          residualRating = item.residualLikelihood * item.residualSeverity;
          residualLevel = calculateRiskLevel(residualRating);
        }
        return this.itemRepository.create({
          ...item,
          rating,
          level,
          residualRating,
          residualLevel,
          [this.riskIdField]: savedRisk.id,
        });
      });
      await this.itemRepository.save(assessmentItems);
    }

    await this.logAction(AuditAction.CREATE, userId, savedRisk.id, `Created with ${items?.length || 0} items`);
    return this.findOne(savedRisk.id);
  }

  async findAll(filters?: { status?: string; level?: string; department?: string; search?: string }, searchFields: string[] = []): Promise<T[]> {
    const query = this.repository
      .createQueryBuilder('risk')
      .leftJoinAndSelect('risk.owner', 'owner')
      .leftJoinAndSelect('risk.reviewer', 'reviewer')
      .leftJoinAndSelect('risk.items', 'items')
      .orderBy('risk.createdAt', 'DESC');

    if (filters?.status && filters.status !== 'all') {
      query.andWhere('risk.status = :status', { status: filters.status });
    }

    if (filters?.level && filters.level !== 'all') {
      query.andWhere('risk.maxRiskLevel = :level', { level: filters.level });
    }

    if (filters?.department && filters.department !== 'all') {
      query.andWhere('risk.department = :department', { department: filters.department });
    }

    if (filters?.search && searchFields.length > 0) {
      const searchClauses = searchFields.map(field => `${field} ILIKE :search`);
      searchClauses.push('items.hazardOrAspect ILIKE :search');
      searchClauses.push('risk.riskNumber ILIKE :search');
      query.andWhere(`(${searchClauses.join(' OR ')})`, { search: `%${filters.search}%` });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<T> {
    const risk = await this.repository.findOne({
        where: { id } as any,
        relations: ['owner', 'reviewer', 'items'],
    });
    if (!risk) throw new NotFoundException(`Risk with ID ${id} not found`);
    return risk;
  }

  async update(id: string, updateDto: any, userId?: string): Promise<T> {
    const risk = await this.findOne(id);
    const { items, maxRiskLevel: dtoMaxRiskLevel, ...riskData } = updateDto;

    if (items) {
      await this.itemRepository.delete({ [this.riskIdField]: id });
      (risk as any).items = []; // Clear in-memory collection to avoid save conflicts
      
      const assessmentItems = items.map(item => {
        const rating = item.likelihood * item.severity;
        const level = calculateRiskLevel(rating);
        let residualRating: number | undefined;
        let residualLevel: RiskLevel | undefined;
        if (item.residualLikelihood && item.residualSeverity) {
          residualRating = item.residualLikelihood * item.residualSeverity;
          residualLevel = calculateRiskLevel(residualRating);
        }
        
        const { id: itemId, createdAt, updatedAt, ...cleanItemData } = item;
        
        return this.itemRepository.create({
          ...cleanItemData,
          rating,
          level,
          residualRating,
          residualLevel,
          [this.riskIdField]: id,
        });
      });
      
      const savedItems = await this.itemRepository.save(assessmentItems);
      (risk as any).items = savedItems;
      risk.maxRiskLevel = this.getHighestRiskLevel(items);
    }

    Object.assign(risk, riskData);

    // Always recalculate max risk level after saving items, or use current items
    if (risk.items && risk.items.length > 0) {
      risk.maxRiskLevel = this.getHighestRiskLevel(risk.items);
    } else if (items) {
      risk.maxRiskLevel = this.getHighestRiskLevel(items);
    }

    await this.repository.save(risk);
    if (userId) await this.logAction(AuditAction.UPDATE, userId, id, `Updated`);
    return this.findOne(id);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const risk = await this.findOne(id);
    if (risk.status !== RiskStatus.DRAFT) throw new BadRequestException('Only draft assessments can be deleted');
    if (userId) await this.logAction(AuditAction.DELETE, userId, id, `Deleted`);

    // Nullify FK references in audit_logs before deleting (preserves history, releases constraint)
    await this.auditLogRepository
      .createQueryBuilder()
      .update()
      .set({ [this.riskIdField]: null } as any)
      .where(`"${this.riskIdField}" = :id`, { id })
      .execute();

    await this.repository.remove(risk);
  }

  async submitForReview(id: string, userId?: string): Promise<T> {
    const risk = await this.findOne(id);
    if (risk.status !== RiskStatus.DRAFT) throw new BadRequestException('Only draft assessments can be submitted');
    if (!risk.reviewerId) throw new BadRequestException('No reviewer assigned');
    risk.status = RiskStatus.PENDING_REVIEW;
    await this.repository.save(risk);
    if (userId) await this.logAction(AuditAction.SUBMIT, userId, id, `Submitted for review`);
    return this.findOne(id);
  }

  async approve(id: string, reviewDto: any, userId?: string): Promise<T> {
    const risk = await this.findOne(id);
    if (risk.status !== RiskStatus.PENDING_REVIEW) throw new BadRequestException('Not in pending review');
    risk.status = RiskStatus.OPEN;
    (risk as any).reviewComments = reviewDto.reviewComments || '';
    await this.repository.save(risk);
    if (userId) await this.logAction(AuditAction.APPROVE, userId, id, `Approved`);
    return this.findOne(id);
  }

  async reject(id: string, reviewDto: any, userId?: string): Promise<T> {
    const risk = await this.findOne(id);
    if (risk.status !== RiskStatus.PENDING_REVIEW) throw new BadRequestException('Not in pending review');
    risk.status = RiskStatus.DRAFT;
    (risk as any).reviewComments = reviewDto.reviewComments || '';
    await this.repository.save(risk);
    if (userId) await this.logAction(AuditAction.REJECT, userId, id, `Rejected`);
    return this.findOne(id);
  }

  protected async logAction(action: AuditAction, userId: string, riskId: string, details: string) {
    const log = this.auditLogRepository.create({
      action,
      userId,
      [this.riskIdField]: riskId,
      details,
    });
    await this.auditLogRepository.save(log);
  }

  async getDashboard(): Promise<any> {
    const risks = await this.repository.find({ relations: ['items'] });
    const total = risks.length;
    const byLevel = {
      low: risks.filter(r => r.maxRiskLevel?.toLowerCase() === RiskLevel.LOW).length,
      medium: risks.filter(r => r.maxRiskLevel?.toLowerCase() === RiskLevel.MEDIUM).length,
      high: risks.filter(r => r.maxRiskLevel?.toLowerCase() === RiskLevel.HIGH).length,
      critical: risks.filter(r => r.maxRiskLevel?.toLowerCase() === RiskLevel.CRITICAL).length,
    };
    const byStatus = {
      draft: risks.filter(r => r.status === RiskStatus.DRAFT).length,
      pending_review: risks.filter(r => r.status === RiskStatus.PENDING_REVIEW).length,
      open: risks.filter(r => r.status === RiskStatus.OPEN).length,
      closed: risks.filter(r => (r.status as any) === RiskStatus.CLOSED).length,
    };

    const byDepartment: { [key: string]: number } = {};
    const matrix: { [key: string]: number } = {};

    risks.forEach(r => {
      if (r.department) {
        byDepartment[r.department] = (byDepartment[r.department] || 0) + 1;
      }
      
      if (r.items) {
        r.items.forEach(item => {
          const key = `${item.likelihood}-${item.severity}`;
          matrix[key] = (matrix[key] || 0) + 1;
        });
      }
    });

    return { total, byLevel, byStatus, byDepartment, matrix };
  }
}
