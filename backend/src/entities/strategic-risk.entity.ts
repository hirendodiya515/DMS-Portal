import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('strategic_risks')
export class StrategicRisk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: 'Risk' | 'Opportunity';

  @Column()
  title: string;

  @Column('text', { nullable: true })
  context: string;

  @Column('text', { nullable: true })
  rootCause: string;

  @Column({ nullable: true })
  contextSource: string;

  @Column({ type: 'int', default: 1 })
  consequence: number;

  @Column({ type: 'int', default: 1 })
  likelihood: number;

  @Column({ type: 'int', default: 1 })
  riskLevel: number;

  @Column('simple-array', { nullable: true })
  standards: string[];

  @Column('text', { nullable: true })
  mitigationControl: string;

  @Column('text', { nullable: true })
  actionPlan: string;

  @Column()
  owner: string;

  @Column({ type: 'date', nullable: true })
  targetDate: Date;

  @Column({ default: 'Open' })
  status: 'Open' | 'Mitigated' | 'Closed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
