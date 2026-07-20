import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Flowchart } from '../entities/flowchart.entity';
import { Document } from '../entities/document.entity';
import { Equipment } from '../entities/equipment.entity';

export interface NodeSummaryResponse {
  sops: number;
  formats: number;
  manuals: number;
  equipment: number;
}

@Injectable()
export class FlowchartService {
  constructor(
    @InjectRepository(Flowchart)
    private flowchartRepository: Repository<Flowchart>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,
  ) {}

  async findAll(): Promise<Flowchart[]> {
    return this.flowchartRepository.find();
  }

  async findOne(id: string): Promise<Flowchart | null> {
    return this.flowchartRepository.findOneBy({ id });
  }

  async getLatest(): Promise<Flowchart | null> {
    const flowcharts = await this.flowchartRepository.find({
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    return flowcharts.length > 0 ? flowcharts[0] : null;
  }

  async createOrUpdate(data: Partial<Flowchart>): Promise<Flowchart | null> {
    if (data.id) {
      await this.flowchartRepository.update(data.id, data);
      return this.flowchartRepository.findOneBy({ id: data.id });
    } else {
      const flowchart = this.flowchartRepository.create(data);
      return this.flowchartRepository.save(flowchart);
    }
  }

  async getNodeSummary(nodeId: string, label?: string, dept?: string): Promise<NodeSummaryResponse> {
    // Prefer department name over node label for document/equipment matching
    const targetDept = (dept || label || '').trim();

    if (!targetDept) {
      return { sops: 0, formats: 0, manuals: 0, equipment: 0 };
    }

    const filterLower = targetDept.toLowerCase();

    // Fetch all documents and filter by target department
    const allDocs = await this.documentRepository.find();
    
    const matchedDocs = allDocs.filter(doc => {
      // Check departments field (can be string or string[])
      let deptMatch = false;
      if (Array.isArray(doc.departments)) {
        deptMatch = doc.departments.some(d => typeof d === 'string' && d.toLowerCase().includes(filterLower));
      } else if (typeof doc.departments === 'string') {
        deptMatch = (doc.departments as string).toLowerCase().includes(filterLower);
      }
      
      const titleMatch = doc.title ? doc.title.toLowerCase().includes(filterLower) : false;
      const descMatch = doc.description ? doc.description.toLowerCase().includes(filterLower) : false;

      return deptMatch || titleMatch || descMatch;
    });

    // Helper to match doc types
    const isType = (docType: string, targets: string[]) => {
      if (!docType) return false;
      const t = docType.toLowerCase().trim();
      return targets.some(target => t === target || t.includes(target));
    };

    const sops = matchedDocs.filter(d => isType(d.type, ['sop', 'procedure', 'work_instruction', 'work instruction'])).length;
    const formats = matchedDocs.filter(d => isType(d.type, ['format', 'form', 'record'])).length;
    const manuals = matchedDocs.filter(d => isType(d.type, ['manual', 'policy'])).length;

    // Fetch equipment matching department/location
    const equipFiltered = await this.equipmentRepository.find({
      where: [
        { department: ILike(`%${targetDept}%`) },
        { location: ILike(`%${targetDept}%`) },
        { line: ILike(`%${targetDept}%`) }
      ]
    });

    const equipmentCount = equipFiltered.length;

    return {
      sops,
      formats,
      manuals,
      equipment: equipmentCount,
    };
  }
}
