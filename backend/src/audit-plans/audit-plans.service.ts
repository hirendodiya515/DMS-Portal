import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditPlan } from '../entities/audit-plan.entity';

@Injectable()
export class AuditPlansService {
  constructor(
    @InjectRepository(AuditPlan)
    private auditPlansRepository: Repository<AuditPlan>,
  ) {}

  findAll() {
    return this.auditPlansRepository.find();
  }

  async upsert(department: string, month: string, isPlanned: boolean, outcome: 'actual' | 'cancelled' | null) {
    let plan = await this.auditPlansRepository.findOne({ where: { department, month } });

    if (plan) {
      plan.isPlanned = isPlanned;
      plan.outcome = outcome;
    } else {
      plan = this.auditPlansRepository.create({
        department,
        month,
        isPlanned,
        outcome,
      });
    }

    // If both are false/null, we could delete the entry to keep DB clean, 
    // but keeping it with false/null is also fine. Let's delete if meaningful data is gone.
    if (!isPlanned && !outcome) {
        if (plan.id) {
            await this.auditPlansRepository.delete(plan.id);
        }
        return null;
    }

    return this.auditPlansRepository.save(plan);
  }
}
