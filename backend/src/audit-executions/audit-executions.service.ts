import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditExecution } from '../entities/audit-execution.entity';

import { AuditSchedule, AuditScheduleStatus } from '../entities/audit-schedule.entity';
import { AuditParticipant, AuditParticipantType } from '../entities/audit-participant.entity';

@Injectable()
export class AuditExecutionsService {
  constructor(
    @InjectRepository(AuditExecution)
    private repository: Repository<AuditExecution>,
    @InjectRepository(AuditSchedule)
    private scheduleRepo: Repository<AuditSchedule>,
    @InjectRepository(AuditParticipant)
    private participantRepo: Repository<AuditParticipant>,
  ) {}

  async getSummary(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 1. Schedules Stats
    const schedules = await this.scheduleRepo.find({
        where: {
            date: Between(start, end)
        }
    });

    const totalSchedules = schedules.length;
    const completedSchedules = schedules.filter(s => s.status === AuditScheduleStatus.COMPLETED).length;

    // 2. Findings Stats (NCs, AFIs, Score)
    const executions = await this.repository.find({
        where: {
            date: Between(start, end),
            status: 'Submitted'
        },
        relations: ['schedule']
    });

    let totalNC = 0;
    let totalAFI = 0;
    let totalEntries = 0;
    let compliantEntries = 0;

    executions.forEach(exec => {
        if (!exec.entries) return;
        exec.entries.forEach(entry => {
             totalEntries++;
             if (entry.status === 'NC') {
                 totalNC++;
             } else if (entry.status === 'AFI') {
                 totalAFI++;
                 compliantEntries++; // AFI is still compliant usually, or maybe handled separately. Let's assume OK and AFI are compliant.
             } else if (entry.status === 'OK') {
                 compliantEntries++;
             }
        });
    });

    const complianceScore = totalEntries > 0 
        ? Math.round((compliantEntries / totalEntries) * 100) 
        : 100;

    return {
        stats: {
            totalSchedules,
            completedSchedules,
            totalNC,
            totalAFI,
            complianceScore
        },
        reports: executions.map(e => ({
            id: e.id,
            date: e.date,
            department: e.schedule?.department || 'N/A',
            scope: e.schedule?.scope || '',
            auditors: e.schedule?.auditors || [], 
            ncCount: e.entries?.filter(ent => ent.status === 'NC').length || 0,
            afiCount: e.entries?.filter(ent => ent.status === 'AFI').length || 0,
        }))
    };
  }

  async findOne(id: string) {
    const execution = await this.repository.findOne({
      where: { id },
      relations: ['schedule', 'schedule.auditors']
    });

    if (execution && execution.schedule) {
        const auditees = await this.participantRepo.find({
            where: {
                department: execution.schedule.department,
                type: AuditParticipantType.AUDITEE
            }
        });
        return { ...execution, auditees };
    }

    return execution;
  }

  findAll(scheduleId?: string) {
    const where: any = {};
    if (scheduleId) {
        where.scheduleId = scheduleId;
    }
    return this.repository.find({
      where,
      order: { date: 'DESC' },
    });
  }

  async create(data: Partial<AuditExecution>) {
    const execution = this.repository.create(data);
    const saved = await this.repository.save(execution);
    
    // Update schedule status
    if (data.scheduleId) {
        let scheduleStatus = AuditScheduleStatus.IN_PROGRESS;
        if (data.status === 'Submitted') {
            scheduleStatus = AuditScheduleStatus.COMPLETED;
        }
        await this.scheduleRepo.update(data.scheduleId, { status: scheduleStatus });
    }

    return saved;
  }

  async update(id: string, data: Partial<AuditExecution>) {
    await this.repository.update(id, data);
    
    // Update schedule status if we have the execution loaded or if we re-fetch
    // To be safe, let's fetch the execution to get the scheduleId if it wasn't passed (it likely wasn't)
    const execution = await this.repository.findOneBy({ id });
    if (execution && execution.scheduleId) {
        let scheduleStatus: AuditScheduleStatus | null = null;
        if (data.status === 'Submitted') {
            scheduleStatus = AuditScheduleStatus.COMPLETED;
        } else if (data.status === 'Draft') {
             scheduleStatus = AuditScheduleStatus.IN_PROGRESS;
        }
        
        if (scheduleStatus) {
            await this.scheduleRepo.update(execution.scheduleId, { status: scheduleStatus });
        }
    }

    return execution;
  }

  async remove(id: string) {
    return this.repository.delete(id);
  }
}
