import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrategicRisk } from '../entities/strategic-risk.entity';
import { SwotIssue } from '../entities/swot-issue.entity';

@Injectable()
export class StrategicRisksService {
  constructor(
    @InjectRepository(StrategicRisk)
    private readonly riskRepository: Repository<StrategicRisk>,
    @InjectRepository(SwotIssue)
    private readonly swotRepository: Repository<SwotIssue>,
  ) {}

  findAll() {
    return this.riskRepository.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: Partial<StrategicRisk>) {
    const risk = this.riskRepository.create(data);
    const savedRisk = await this.riskRepository.save(risk);

    if (data.swotIssueId) {
      await this.swotRepository.update(data.swotIssueId, {
        isConverted: true,
        linkedRiskId: savedRisk.id,
        evaluation: savedRisk.type === 'Opportunity' ? 'Escalate to Opportunity Register' : 'Escalate to Risk Register'
      });
    }

    return savedRisk;
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
    const risk = await this.riskRepository.findOne({ where: { id } });
    if (risk && risk.swotIssueId) {
      await this.swotRepository.update(risk.swotIssueId, {
        isConverted: false,
        linkedRiskId: null,
        evaluation: 'No Further Action'
      });
    }
    await this.riskRepository.delete(id);
    return { deleted: true };
  }
}
