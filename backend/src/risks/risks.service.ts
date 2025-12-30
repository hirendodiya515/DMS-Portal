import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Risk, RiskType, RiskStatus, RiskLevel, calculateRiskLevel } from '../entities/risk.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { CreateRiskDto, UpdateRiskDto, ReviewRiskDto } from './dto/risks.dto';

@Injectable()
export class RisksService {
  private riskCounter = 0;

  constructor(
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
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

  // ================== CRUD OPERATIONS ==================

  async create(createDto: CreateRiskDto, userId: string): Promise<Risk> {
    const riskRating = createDto.likelihood * createDto.severity;
    const riskLevel = calculateRiskLevel(riskRating);

    // Calculate residual risk if provided
    let residualRating: number | undefined;
    let residualLevel: RiskLevel | undefined;
    if (createDto.residualLikelihood && createDto.residualSeverity) {
      residualRating = createDto.residualLikelihood * createDto.residualSeverity;
      residualLevel = calculateRiskLevel(residualRating);
    }

    // Auto-assign reviewer to department head
    let reviewerId: string | undefined;
    if (createDto.department) {
      const deptHead = await this.findDepartmentHead(createDto.department);
      if (deptHead) {
        reviewerId = deptHead.id;
      }
    }

    const risk = this.riskRepository.create({
      ...createDto,
      riskNumber: this.generateRiskNumber(),
      riskRating,
      riskLevel,
      residualRating,
      residualLevel,
      ownerId: userId,
      reviewerId,
      status: RiskStatus.DRAFT,
    });

    const savedRisk = await this.riskRepository.save(risk);
    
    await this.logAction(AuditAction.CREATE, userId, savedRisk.id, `Risk "${savedRisk.title}" created`);
    
    return savedRisk;
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
      .orderBy('risk.createdAt', 'DESC');

    if (filters?.type && filters.type !== 'all') {
      query.andWhere('risk.type = :type', { type: filters.type });
    }

    if (filters?.status && filters.status !== 'all') {
      query.andWhere('risk.status = :status', { status: filters.status });
    }

    if (filters?.level && filters.level !== 'all') {
      query.andWhere('risk.riskLevel = :level', { level: filters.level });
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
      relations: ['owner', 'reviewer', 'relatedDocuments'],
    });

    if (!risk) {
      throw new NotFoundException(`Risk with ID ${id} not found`);
    }

    return risk;
  }

  async update(id: string, updateDto: UpdateRiskDto, userId?: string): Promise<Risk> {
    const risk = await this.findOne(id);

    // Recalculate risk rating if likelihood or severity changed
    if (updateDto.likelihood !== undefined || updateDto.severity !== undefined) {
      const likelihood = updateDto.likelihood ?? risk.likelihood;
      const severity = updateDto.severity ?? risk.severity;
      updateDto['riskRating'] = likelihood * severity;
      updateDto['riskLevel'] = calculateRiskLevel(updateDto['riskRating']);
    }

    // Recalculate residual risk if changed
    if (updateDto.residualLikelihood !== undefined || updateDto.residualSeverity !== undefined) {
      const residualLikelihood = updateDto.residualLikelihood ?? risk.residualLikelihood;
      const residualSeverity = updateDto.residualSeverity ?? risk.residualSeverity;
      if (residualLikelihood && residualSeverity) {
        updateDto['residualRating'] = residualLikelihood * residualSeverity;
        updateDto['residualLevel'] = calculateRiskLevel(updateDto['residualRating']);
      }
    }

    // Auto-assign reviewer if department changed
    if (updateDto.department && updateDto.department !== risk.department) {
      const deptHead = await this.findDepartmentHead(updateDto.department);
      if (deptHead) {
        updateDto['reviewerId'] = deptHead.id;
      }
    }

    Object.assign(risk, updateDto);
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
      low: risks.filter(r => r.riskLevel === RiskLevel.LOW).length,
      medium: risks.filter(r => r.riskLevel === RiskLevel.MEDIUM).length,
      high: risks.filter(r => r.riskLevel === RiskLevel.HIGH).length,
      critical: risks.filter(r => r.riskLevel === RiskLevel.CRITICAL).length,
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

    // Risk matrix data (5x5 grid)
    const matrix: { [key: string]: number } = {};
    for (let l = 1; l <= 5; l++) {
      for (let s = 1; s <= 5; s++) {
        const key = `${l}-${s}`;
        matrix[key] = risks.filter(r => r.likelihood === l && r.severity === s).length;
      }
    }

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
