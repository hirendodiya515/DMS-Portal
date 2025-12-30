import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgNode } from '../entities/org-node.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrgChartService {
  constructor(
    @InjectRepository(OrgNode)
    private orgNodeRepository: Repository<OrgNode>,
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  findAll() {
    return this.orgNodeRepository.find();
  }

  findOne(id: string) {
    return this.orgNodeRepository.findOne({ where: { id } });
  }

  private async logAction(action: AuditAction, userId: string, details: string) {
      if (!userId) return; 
      const log = this.auditRepository.create({
          action,
          userId: userId,
          details,
      });
      await this.auditRepository.save(log);
  }

  async create(createOrgNodeDto: Partial<OrgNode>, userId: string) {
    if (!createOrgNodeDto.id) {
        createOrgNodeDto.id = uuidv4();
    }
    const node = this.orgNodeRepository.create(createOrgNodeDto);
    const saved = await this.orgNodeRepository.save(node);
    await this.logAction(AuditAction.ORG_CHART_UPDATE, userId, `Added employee: ${saved.name}`);
    return saved;
  }

  async update(id: string, updateOrgNodeDto: Partial<OrgNode>, userId: string) {
    const node = await this.findOne(id);
    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }
    Object.assign(node, updateOrgNodeDto);
    const saved = await this.orgNodeRepository.save(node);
    await this.logAction(AuditAction.ORG_CHART_UPDATE, userId, `Updated employee: ${saved.name}`);
    return saved;
  }

  async remove(id: string, userId: string) {
    const node = await this.findOne(id);
    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }
    await this.orgNodeRepository.remove(node);
    await this.logAction(AuditAction.ORG_CHART_UPDATE, userId, `Removed employee: ${node.name}`);
    return { deleted: true };
  }

  async bulkUpsert(nodes: Partial<OrgNode>[], userId: string) {
    const saved = await this.orgNodeRepository.save(nodes);
    await this.logAction(AuditAction.ORG_CHART_UPDATE, userId, `Bulk upload of ${nodes.length} employees`);
    return saved;
  }
}
