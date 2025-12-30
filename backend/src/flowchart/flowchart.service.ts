import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flowchart } from '../entities/flowchart.entity';

@Injectable()
export class FlowchartService {
  constructor(
    @InjectRepository(Flowchart)
    private flowchartRepository: Repository<Flowchart>,
  ) {}

  async findAll(): Promise<Flowchart[]> {
    return this.flowchartRepository.find();
  }

  async findOne(id: string): Promise<Flowchart | null> {
    return this.flowchartRepository.findOneBy({ id });
  }

  async getLatest(): Promise<Flowchart | null> {
    // For now, we'll assume a single global flowchart or fetch the most recent one
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
}
