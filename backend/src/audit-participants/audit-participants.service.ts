import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditParticipant, AuditParticipantType } from '../entities/audit-participant.entity';

@Injectable()
export class AuditParticipantsService {
  constructor(
    @InjectRepository(AuditParticipant)
    private repository: Repository<AuditParticipant>,
  ) {}

  findAll() {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  findByType(type: AuditParticipantType) {
    return this.repository.find({
      where: { type },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<AuditParticipant>) {
    const participant = this.repository.create(data);
    return this.repository.save(participant);
  }

  async update(id: string, data: Partial<AuditParticipant>) {
    await this.repository.update(id, data);
    return this.repository.findOne({ where: { id } });
  }

  async remove(id: string) {
    return this.repository.delete(id);
  }
}
