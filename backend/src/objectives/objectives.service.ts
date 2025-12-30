import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Objective, ObjectiveStatus } from '../entities/objective.entity';
import { ObjectiveMeasurement } from '../entities/objective-measurement.entity';
import { Document } from '../entities/document.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import {
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateMeasurementDto,
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
  ) {
    this.initializeCounter();
  }

  private async initializeCounter() {
    const count = await this.objectiveRepository.count();
    this.objectiveCounter = count;
  }

  private generateObjectiveNumber(): string {
    this.objectiveCounter++;
    return `OBJ-${String(this.objectiveCounter).padStart(3, '0')}`;
  }

  // ================== OBJECTIVES ==================

  async create(createDto: CreateObjectiveDto, userId: string): Promise<Objective> {
    const objective = this.objectiveRepository.create({
      ...createDto,
      objectiveNumber: this.generateObjectiveNumber(),
      ownerId: userId,
      status: ObjectiveStatus.ACTIVE,
      higherIsBetter: createDto.higherIsBetter ?? true,
    });

    const savedObjective = await this.objectiveRepository.save(objective);
    
    await this.logAction(AuditAction.CREATE, userId, savedObjective.id, `Objective "${savedObjective.name}" created`);
    
    return savedObjective;
  }

  async findAll(filters?: {
    type?: string;
    status?: string;
    department?: string;
    search?: string;
  }): Promise<Objective[]> {
    const query = this.objectiveRepository
      .createQueryBuilder('objective')
      .leftJoinAndSelect('objective.owner', 'owner')
      .leftJoinAndSelect('objective.measurements', 'measurements')
      .orderBy('objective.createdAt', 'DESC');

    if (filters?.type && filters.type !== 'all') {
      query.andWhere('objective.type = :type', { type: filters.type });
    }

    if (filters?.status && filters.status !== 'all') {
      query.andWhere('objective.status = :status', { status: filters.status });
    }

    if (filters?.department) {
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

  // ================== DASHBOARD ==================

  async getDashboardStats(filters?: {
    type?: string;
    status?: string;
    search?: string;
  }): Promise<any> {
    const query = this.objectiveRepository
      .createQueryBuilder('objective')
      .leftJoinAndSelect('objective.owner', 'owner')
      .leftJoinAndSelect('objective.measurements', 'measurements');

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
