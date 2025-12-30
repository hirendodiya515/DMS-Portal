import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AuditSchedule } from '../entities/audit-schedule.entity';
import { AuditParticipant } from '../entities/audit-participant.entity';

@Injectable()
export class AuditSchedulesService {
  constructor(
    @InjectRepository(AuditSchedule)
    private repository: Repository<AuditSchedule>,
    @InjectRepository(AuditParticipant)
    private participantRepository: Repository<AuditParticipant>,
  ) {}

  findAll() {
    return this.repository.find({
      order: { date: 'ASC' },
      relations: ['auditors'],
    });
  }

  findOne(id: string) {
    return this.repository.findOne({
        where: { id },
        relations: ['auditors'],
    });
  }

  async create(data: any) {
    const { auditorIds, ...rest } = data;
    
    // Explicitly cast to AuditSchedule to avoid array inference
    const schedule = (this.repository.create(rest) as unknown) as AuditSchedule;
    
    if (auditorIds && auditorIds.length > 0) {
        const auditors = await this.participantRepository.findBy({
            id: In(auditorIds)
        });
        schedule.auditors = auditors;
    }

    return this.repository.save(schedule);
  }

  async update(id: string, data: any) {
    const { auditorIds, ...rest } = data;
    
    const schedule = await this.repository.findOne({ where: { id }, relations: ['auditors'] });
    if (!schedule) throw new Error('Schedule not found');

    this.repository.merge(schedule, rest);

    if (auditorIds) {
        const auditors = await this.participantRepository.findBy({
            id: In(auditorIds)
        });
        schedule.auditors = auditors;
    }

    return this.repository.save(schedule);
  }

  async remove(id: string) {
    const schedule = await this.repository.findOne({ where: { id } });
    if (schedule) {
        return this.repository.remove(schedule);
    }
  }
}
