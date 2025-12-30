import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('flowcharts')
export class Flowchart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'New Flowchart' })
  name: string;

  @Column('jsonb', { default: [] })
  nodes: any[];

  @Column('jsonb', { default: [] })
  edges: any[];

  @Column('jsonb', { default: {} })
  departmentFlows: Record<string, { nodes: any[]; edges: any[] }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
