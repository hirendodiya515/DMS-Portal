import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Objective, ObjectiveStatus } from '../entities/objective.entity';
import { ObjectiveMeasurement } from '../entities/objective-measurement.entity';
import { Document } from '../entities/document.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import {
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateMeasurementDto,
  UpdateMeasurementDto,
  CarryForwardDto,
} from './dto/objectives.dto';

@Injectable()
export class ObjectivesService {
  private objectiveCounter = 0;

  constructor(
    @InjectRepository(Objective)
    private objectiveRepository: Repository<Objective>,
    @InjectRepository(ObjectiveMeasurement)
    private measurementRepository: Repository<ObjectiveMeasurement>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.initializeCounter();
  }

  private async initializeCounter() {
    const objectives = await this.objectiveRepository.find({
      select: ['objectiveNumber'],
    });
    
    let maxCounter = 0;
    for (const obj of objectives) {
      if (obj.objectiveNumber && obj.objectiveNumber.startsWith('OBJ-')) {
        const numPart = obj.objectiveNumber.split('-')[1];
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxCounter) {
          maxCounter = num;
        }
      }
    }
    this.objectiveCounter = maxCounter;
  }

  private generateObjectiveNumber(): string {
    this.objectiveCounter++;
    return `OBJ-${String(this.objectiveCounter).padStart(3, '0')}`;
  }

  // ================== OBJECTIVES ==================

  async create(createDto: CreateObjectiveDto, userId: string): Promise<Objective> {
    let assignedOwnerId = createDto.ownerId;

    // If ownerId not explicitly provided, try to find Dept Head or Reviewer for department
    if (!assignedOwnerId) {
      assignedOwnerId = userId; // Fallback to creator
      if (createDto.department) {
        let deptManager = await this.userRepository.findOne({
          where: { department: createDto.department, role: UserRole.DEPT_HEAD, isActive: true },
        });

        if (!deptManager) {
          deptManager = await this.userRepository.findOne({
            where: { department: createDto.department, role: UserRole.REVIEWER, isActive: true },
          });
        }

        if (deptManager) {
          assignedOwnerId = deptManager.id;
        }
      }
    }

    const objective = this.objectiveRepository.create({
      name: createDto.name,
      description: createDto.description,
      type: createDto.type,
      department: createDto.department,
      uom: createDto.uom,
      frequency: createDto.frequency,
      target: createDto.target,
      ownerId: assignedOwnerId,
      financialYear: createDto.financialYear || '2026-27',
      monthlyTargets: createDto.monthlyTargets || undefined,
      status: ObjectiveStatus.ACTIVE,
      higherIsBetter: createDto.higherIsBetter ?? true,
      hasSubTargets: createDto.hasSubTargets ?? false,
      aggregationType: createDto.aggregationType || 'sum',
      subTargets: createDto.subTargets || [],
      objectiveNumber: this.generateObjectiveNumber(),
    });

    const savedObjective = await this.objectiveRepository.save(objective);
    
    await this.logAction(AuditAction.CREATE, userId, savedObjective.id, `Objective "${savedObjective.name}" created for ${savedObjective.financialYear}`);
    
    return savedObjective;
  }

  async findAll(filters?: {
    type?: string;
    status?: string;
    department?: string;
    search?: string;
    financialYear?: string;
  }): Promise<Objective[]> {
    const query = this.objectiveRepository
      .createQueryBuilder('objective')
      .leftJoinAndSelect('objective.owner', 'owner')
      .leftJoinAndSelect('objective.measurements', 'measurements')
      .orderBy('objective.createdAt', 'DESC');

    if (filters?.financialYear && filters.financialYear !== 'all') {
      query.andWhere('objective.financialYear = :financialYear', {
        financialYear: filters.financialYear,
      });
    }

    if (filters?.type && filters.type !== 'all') {
      query.andWhere('objective.type = :type', { type: filters.type });
    }

    if (filters?.status && filters.status !== 'all') {
      query.andWhere('objective.status = :status', { status: filters.status });
    }

    if (filters?.department && filters.department !== 'all') {
      query.andWhere('objective.department = :department', {
        department: filters.department,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(objective.name ILIKE :search OR objective.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Objective> {
    const objective = await this.objectiveRepository.findOne({
      where: { id },
      relations: ['owner', 'measurements', 'measurements.recordedBy', 'relatedDocuments'],
    });

    if (!objective) {
      throw new NotFoundException(`Objective with ID ${id} not found`);
    }

    return objective;
  }

  async update(id: string, updateDto: UpdateObjectiveDto, userId?: string): Promise<Objective> {
    const objective = await this.findOne(id);
    Object.assign(objective, updateDto);
    await this.objectiveRepository.save(objective);
    
    if (userId) {
      await this.logAction(AuditAction.UPDATE, userId, id, `Objective "${objective.name}" updated`);
    }
    
    return this.findOne(id);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const objective = await this.findOne(id);
    
    if (userId) {
      await this.logAction(AuditAction.DELETE, userId, id, `Objective "${objective.name}" deleted`);
    }
    
    await this.objectiveRepository.remove(objective);
  }

  // ================== MEASUREMENTS ==================

  async addMeasurement(
    objectiveId: string,
    createDto: CreateMeasurementDto,
    userId: string,
  ): Promise<ObjectiveMeasurement> {
    const objective = await this.findOne(objectiveId);

    const measurement = this.measurementRepository.create({
      ...createDto,
      objectiveId: objective.id,
      recordedById: userId,
      subValues: createDto.subValues || [],
    });

    const savedMeasurement = await this.measurementRepository.save(measurement);
    
    await this.logAction(AuditAction.MEASUREMENT_ADD, userId, objectiveId, `Measurement added to objective "${objective.name}"`);
    
    return savedMeasurement;
  }

  async getMeasurements(objectiveId: string): Promise<ObjectiveMeasurement[]> {
    return this.measurementRepository.find({
      where: { objectiveId },
      relations: ['recordedBy'],
      order: { measurementDate: 'DESC' },
    });
  }

  async updateMeasurement(
    measurementId: string,
    updateDto: UpdateMeasurementDto,
    userId: string,
  ): Promise<ObjectiveMeasurement> {
    const measurement = await this.measurementRepository.findOne({
      where: { id: measurementId },
      relations: ['objective'],
    });

    if (!measurement) {
      throw new NotFoundException(`Measurement with ID ${measurementId} not found`);
    }

    Object.assign(measurement, updateDto);
    const updatedMeasurement = await this.measurementRepository.save(measurement);
    
    await this.logAction(AuditAction.UPDATE, userId, measurement.objectiveId, `Measurement updated in objective`);
    
    return updatedMeasurement;
  }

  async deleteMeasurement(measurementId: string, userId?: string): Promise<void> {
    const measurement = await this.measurementRepository.findOne({
      where: { id: measurementId },
      relations: ['objective'],
    });

    if (!measurement) {
      throw new NotFoundException(`Measurement with ID ${measurementId} not found`);
    }

    if (userId) {
      await this.logAction(AuditAction.MEASUREMENT_DELETE, userId, measurement.objectiveId, `Measurement deleted from objective`);
    }

    await this.measurementRepository.remove(measurement);
  }

  // ================== CARRY FORWARD ==================

  async carryForward(
    id: string,
    carryForwardDto: CarryForwardDto,
    userId: string,
  ): Promise<Objective> {
    const original = await this.findOne(id);
    
    // Create cloned objective for target financial year
    const targetFY = carryForwardDto.targetFinancialYear;
    const newTarget = carryForwardDto.target !== undefined ? carryForwardDto.target : original.target;
    const newMonthlyTargets = carryForwardDto.monthlyTargets !== undefined 
      ? carryForwardDto.monthlyTargets 
      : original.monthlyTargets;

    const clonedObjective = this.objectiveRepository.create({
      name: original.name,
      description: original.description,
      type: original.type,
      department: original.department,
      uom: original.uom,
      frequency: original.frequency,
      target: newTarget,
      monthlyTargets: newMonthlyTargets,
      financialYear: targetFY,
      carriedFromId: original.id,
      higherIsBetter: original.higherIsBetter,
      hasSubTargets: original.hasSubTargets,
      aggregationType: original.aggregationType,
      subTargets: original.subTargets || [],
      ownerId: original.ownerId,
      status: ObjectiveStatus.ACTIVE,
      objectiveNumber: this.generateObjectiveNumber(),
    });

    const savedCloned = await this.objectiveRepository.save(clonedObjective);

    await this.logAction(
      AuditAction.CREATE,
      userId,
      savedCloned.id,
      `Objective "${savedCloned.name}" carried forward from ${original.financialYear} to ${targetFY}`,
    );

    return savedCloned;
  }

  // ================== DASHBOARD ==================

  async getDashboardStats(filters?: {
    type?: string;
    status?: string;
    search?: string;
    financialYear?: string;
  }): Promise<any> {
    const query = this.objectiveRepository
      .createQueryBuilder('objective')
      .leftJoinAndSelect('objective.owner', 'owner')
      .leftJoinAndSelect('objective.measurements', 'measurements');

    if (filters?.financialYear && filters.financialYear !== 'all') {
      query.andWhere('objective.financialYear = :financialYear', {
        financialYear: filters.financialYear,
      });
    }

    if (filters?.type && filters.type !== 'all') {
      query.andWhere('objective.type = :type', { type: filters.type });
    }

    if (filters?.status && filters.status !== 'all') {
      query.andWhere('objective.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(objective.name ILIKE :search OR objective.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const objectives = await query.getMany();

    const totalObjectives = objectives.length;
    const activeObjectives = objectives.filter(
      (o) => o.status === ObjectiveStatus.ACTIVE,
    ).length;
    const completedObjectives = objectives.filter(
      (o) => o.status === ObjectiveStatus.COMPLETED,
    ).length;

    // Calculate progress for each objective
    const objectivesWithProgress = objectives.map((objective) => {
      if (!objective.measurements || objective.measurements.length === 0) {
        return {
          ...objective,
          latestValue: null,
          progress: 0,
          progressStatus: 'behind',
        };
      }

      // Get latest measurement
      const sortedMeasurements = [...objective.measurements].sort(
        (a, b) =>
          new Date(b.measurementDate).getTime() -
          new Date(a.measurementDate).getTime(),
      );
      const latestMeasurement = sortedMeasurements[0];
      const latestValue = Number(latestMeasurement.actualValue);
      const target = Number(objective.target);

      // Calculate progress percentage
      let progress: number;
      if (objective.higherIsBetter) {
        progress = target > 0 ? (latestValue / target) * 100 : 0;
      } else {
        // For lower is better, invert the progress
        progress = latestValue <= target ? 100 : (target / latestValue) * 100;
      }

      const progressStatus = 
        progress >= 100 ? 'achieved' : 
        progress >= 80 ? 'on_track' : 
        progress >= 50 ? 'at_risk' : 'behind';

      return {
        ...objective,
        latestValue,
        progress: Math.min(Math.max(progress, 0), 100),
        progressStatus,
      };
    });

    // Count by progress status
    const onTrack = objectivesWithProgress.filter(
      (o) => o.progressStatus === 'on_track' || o.progressStatus === 'achieved',
    ).length;
    const atRisk = objectivesWithProgress.filter(
      (o) => o.progressStatus === 'at_risk',
    ).length;
    const behind = objectivesWithProgress.filter(
      (o) => o.progressStatus === 'behind',
    ).length;

    // By type
    const byType = {
      quality: objectives.filter((o) => o.type === 'quality').length,
      environmental: objectives.filter((o) => o.type === 'environmental').length,
      safety: objectives.filter((o) => o.type === 'safety').length,
    };

    return {
      summary: {
        total: totalObjectives,
        active: activeObjectives,
        completed: completedObjectives,
        onTrack,
        atRisk,
        behind,
      },
      byType,
      objectives: objectivesWithProgress,
    };
  }

  private async logAction(action: AuditAction, userId: string, objectiveId: string, details: string) {
    const log = this.auditLogRepository.create({
      action,
      userId,
      objectiveId,
      details,
    });
    await this.auditLogRepository.save(log);
  }
}
