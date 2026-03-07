import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrategicRisk } from '../entities/strategic-risk.entity';

@Injectable()
export class StrategicRisksService {
  constructor(
    @InjectRepository(StrategicRisk)
    private readonly riskRepository: Repository<StrategicRisk>,
  ) {}

  findAll() {
    return this.riskRepository.find({ order: { createdAt: 'DESC' } });
  }

  create(data: Partial<StrategicRisk>) {
    const risk = this.riskRepository.create(data);
    return this.riskRepository.save(risk);
  }

  async update(id: string, data: Partial<StrategicRisk>) {
    await this.riskRepository.update(id, data);
    return this.riskRepository.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: 'Open' | 'Mitigated' | 'Closed') {
    await this.riskRepository.update(id, { status });
    return this.riskRepository.findOne({ where: { id } });
  }

  async remove(id: string) {
    await this.riskRepository.delete(id);
    return { deleted: true };
  }
}
