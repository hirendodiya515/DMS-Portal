import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Risk } from '../entities/risk.entity';
import { RiskType, RiskStatus, RiskLevel, calculateRiskLevel } from '../entities/risk.enums';
import { RiskAssessmentItem } from '../entities/risk-assessment-item.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { CreateRiskDto, UpdateRiskDto, ReviewRiskDto, CreateRiskItemDto } from './dto/risks.dto';


@Injectable()
export class RisksService {
  private riskCounter = 0;

  constructor(
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
    @InjectRepository(RiskAssessmentItem)
    private itemRepository: Repository<RiskAssessmentItem>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {
    this.initializeCounter();
  }

  private async initializeCounter() {
    const count = await this.riskRepository.count();
    this.riskCounter = count;
  }

  private generateRiskNumber(): string {
    this.riskCounter++;
    return `R-${String(this.riskCounter).padStart(3, '0')}`;
  }

  // Find department head for auto-assignment
  private async findDepartmentHead(department: string): Promise<User | null> {
    if (!department) return null;
    
    const deptHead = await this.userRepository.findOne({
      where: { 
        department, 
        role: UserRole.DEPT_HEAD,
      },
    });
    
    return deptHead;
  }

  // Calculate highest risk level for parent aggregation
  private getHighestRiskLevel(items: CreateRiskItemDto[]): RiskLevel {
    if (!items || items.length === 0) return RiskLevel.LOW;
    
    const levels = items.map(item => {
      const rating = item.likelihood * item.severity;
      return calculateRiskLevel(rating);
    });

    const levelPriority = {
      [RiskLevel.CRITICAL]: 4,
      [RiskLevel.HIGH]: 3,
      [RiskLevel.MEDIUM]: 2,
      [RiskLevel.LOW]: 1,
    };

    return levels.reduce((max, current) => 
      levelPriority[current] > levelPriority[max] ? current : max
    , RiskLevel.LOW);
  }

  // ================== CRUD OPERATIONS ==================

  async create(createDto: CreateRiskDto, userId: string): Promise<Risk> {
    const maxRiskLevel = this.getHighestRiskLevel(createDto.items);

    // Auto-assign reviewer to department head
    let reviewerId: string | undefined;
    if (createDto.department) {
      const deptHead = await this.findDepartmentHead(createDto.department);
      if (deptHead) {
        reviewerId = deptHead.id;
      }
    }

    const { items, ...riskData } = createDto;

    const risk = this.riskRepository.create({
      ...riskData,
      riskNumber: this.generateRiskNumber(),
      maxRiskLevel,
      ownerId: userId,
      reviewerId,
      status: RiskStatus.DRAFT,
    });

    const savedRisk = await this.riskRepository.save(risk);

    // Save items
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
        riskId: savedRisk.id,
      });
    });

    await this.itemRepository.save(assessmentItems);
    
    await this.logAction(AuditAction.CREATE, userId, savedRisk.id, `Risk "${savedRisk.title}" created with ${items.length} items`);
    
    return this.findOne(savedRisk.id);
  }

  async findAll(filters?: {
    type?: string;
    status?: string;
    level?: string;
    department?: string;
    search?: string;
  }): Promise<Risk[]> {
    const query = this.riskRepository
      .createQueryBuilder('risk')
      .leftJoinAndSelect('risk.owner', 'owner')
      .leftJoinAndSelect('risk.reviewer', 'reviewer')
      .leftJoinAndSelect('risk.items', 'items')
      .orderBy('risk.createdAt', 'DESC');

    if (filters?.type && filters.type !== 'all') {
      query.andWhere('risk.type = :type', { type: filters.type });
    }

    if (filters?.status && filters.status !== 'all') {
      query.andWhere('risk.status = :status', { status: filters.status });
    }

    if (filters?.level && filters.level !== 'all') {
      query.andWhere('risk.maxRiskLevel = :level', { level: filters.level });
    }

    if (filters?.department && filters.department !== 'all') {
      query.andWhere('risk.department = :department', { department: filters.department });
    }

    if (filters?.search) {
      query.andWhere(
        '(risk.title ILIKE :search OR risk.description ILIKE :search OR risk.riskNumber ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Risk> {
    const risk = await this.riskRepository.findOne({
      where: { id },
      relations: ['owner', 'reviewer', 'relatedDocuments', 'items'],
    });

    if (!risk) {
      throw new NotFoundException(`Risk with ID ${id} not found`);
    }

    return risk;
  }

  async update(id: string, updateDto: UpdateRiskDto, userId?: string): Promise<Risk> {
    const risk = await this.findOne(id);

    const { items, ...riskData } = updateDto;

    // Handle items update
    if (items) {
      // For simplicity in this refactor, we replace items. 
      // In a production app, we would sync (add/update/remove).
      await this.itemRepository.delete({ riskId: id });
      
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
          riskId: id,
        });
      });

      await this.itemRepository.save(assessmentItems);
      risk.maxRiskLevel = this.getHighestRiskLevel(items);
    }

    // Auto-assign reviewer if department changed
    if (updateDto.department && updateDto.department !== risk.department) {
      const deptHead = await this.findDepartmentHead(updateDto.department);
      if (deptHead) {
        risk.reviewerId = deptHead.id;
      }
    }

    Object.assign(risk, riskData);
    await this.riskRepository.save(risk);
    
    if (userId) {
      await this.logAction(AuditAction.UPDATE, userId, id, `Risk "${risk.title}" updated`);
    }
    
    return this.findOne(id);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const risk = await this.findOne(id);
    
    // Only allow deletion of draft risks
    if (risk.status !== RiskStatus.DRAFT) {
      throw new BadRequestException('Only draft risks can be deleted');
    }
    
    if (userId) {
      await this.logAction(AuditAction.DELETE, userId, id, `Risk "${risk.title}" deleted`);
    }
    
    await this.riskRepository.remove(risk);
  }

  // ================== WORKFLOW OPERATIONS ==================

  async submitForReview(id: string, userId?: string): Promise<Risk> {
    const risk = await this.findOne(id);

    if (risk.status !== RiskStatus.DRAFT) {
      throw new BadRequestException('Only draft risks can be submitted for review');
    }

    if (!risk.reviewerId) {
      throw new BadRequestException('No reviewer assigned. Please ensure department is set.');
    }

    risk.status = RiskStatus.PENDING_REVIEW;
    await this.riskRepository.save(risk);
    
    if (userId) {
      await this.logAction(AuditAction.SUBMIT, userId, id, `Risk "${risk.title}" submitted for review`);
    }
    
    return this.findOne(id);
  }

  async approve(id: string, reviewDto: ReviewRiskDto, userId?: string): Promise<Risk> {
    const risk = await this.findOne(id);

    if (risk.status !== RiskStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending review risks can be approved');
    }

    risk.status = RiskStatus.OPEN;
    risk.reviewComments = reviewDto.reviewComments || '';
    await this.riskRepository.save(risk);
    
    if (userId) {
      await this.logAction(AuditAction.APPROVE, userId, id, `Risk "${risk.title}" approved`);
    }
    
    return this.findOne(id);
  }

  async reject(id: string, reviewDto: ReviewRiskDto, userId?: string): Promise<Risk> {
    const risk = await this.findOne(id);

    if (risk.status !== RiskStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending review risks can be rejected');
    }

    risk.status = RiskStatus.DRAFT;
    risk.reviewComments = reviewDto.reviewComments || '';
    await this.riskRepository.save(risk);
    
    if (userId) {
      await this.logAction(AuditAction.REJECT, userId, id, `Risk "${risk.title}" rejected`);
    }
    
    return this.findOne(id);
  }

  async close(id: string, reviewDto: ReviewRiskDto, userId?: string): Promise<Risk> {
    const risk = await this.findOne(id);
    risk.status = RiskStatus.CLOSED;
    risk.reviewComments = reviewDto.reviewComments || '';
    await this.riskRepository.save(risk);
    
    if (userId) {
      await this.logAction(AuditAction.CLOSE, userId, id, `Risk "${risk.title}" closed`);
    }
    
    return this.findOne(id);
  }

  // ================== DASHBOARD ==================

  async getDashboard(filters?: { type?: string }): Promise<any> {
    const query = this.riskRepository.createQueryBuilder('risk');

    if (filters?.type && filters.type !== 'all') {
      query.andWhere('risk.type = :type', { type: filters.type });
    }

    const risks = await query.getMany();

    const total = risks.length;
    const byLevel = {
      low: risks.filter(r => r.maxRiskLevel === RiskLevel.LOW).length,
      medium: risks.filter(r => r.maxRiskLevel === RiskLevel.MEDIUM).length,
      high: risks.filter(r => r.maxRiskLevel === RiskLevel.HIGH).length,
      critical: risks.filter(r => r.maxRiskLevel === RiskLevel.CRITICAL).length,
    };

    const byStatus = {
      draft: risks.filter(r => r.status === RiskStatus.DRAFT).length,
      pending_review: risks.filter(r => r.status === RiskStatus.PENDING_REVIEW).length,
      open: risks.filter(r => r.status === RiskStatus.OPEN).length,
      closed: risks.filter(r => r.status === RiskStatus.CLOSED).length,
    };

    const byType = {
      qra: risks.filter(r => r.type === RiskType.QRA).length,
      hira: risks.filter(r => r.type === RiskType.HIRA).length,
      eaa: risks.filter(r => r.type === RiskType.EAA).length,
    };

    // Risk matrix data (based on parent aggregation or individual items?
    // Using max level of activity for consistency).
    const matrix: { [key: string]: number } = {};
    // ... matrix logic adjusted in specialized services as they might want hazard-level matrix
    // For now keeping it activity-based using max level scores is not possible.
    // I'll return total counts for now or skip matrix in base.

    return {
      total,
      byLevel,
      byStatus,
      byType,
      matrix,
    };
  }

  private async logAction(action: AuditAction, userId: string, riskId: string, details: string) {
    const log = this.auditLogRepository.create({
      action,
      userId,
      riskId,
      details,
    });
    await this.auditLogRepository.save(log);
  }
}
