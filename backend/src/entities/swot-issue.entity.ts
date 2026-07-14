import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('swot_issues')
export class SwotIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';

  @Column('text')
  text: string;

  @Column()
  impact: 'low' | 'medium' | 'high' | 'critical';

  @Column({ default: 'NA' })
  pestleCategory: 'Political' | 'Economic' | 'Social' | 'Technological' | 'Legal' | 'Environmental' | 'NA';

  @Column({ default: 'Identified' })
  imsStatus: 'Identified' | 'Under Review' | 'Monitoring' | 'Reviewed';

  @Column({ default: 'Monitor Only' })
  evaluation: 'Monitor Only' | 'Escalate to Risk Register' | 'Escalate to Opportunity Register' | 'Management Review Input' | 'Strategic Objective' | 'Management of Change' | 'No Further Action';

  @Column({ default: 'Stable' })
  trend: 'Increasing' | 'Stable' | 'Reducing' | 'Resolved';

  @Column({ type: 'date', nullable: true })
  lastReviewDate: Date;

  @Column({ default: 'when required' })
  frequency: 'quarterly' | 'half yearly' | 'yearly' | 'when required';

  @Column('simple-array', { nullable: true })
  standards: string[];

  @Column({ default: false })
  isConverted: boolean;

  @Column({ type: 'varchar', nullable: true })
  linkedRiskId: string | null;

  @Column({ type: 'varchar', nullable: true })
  linkedMocRecordId: string | null;

  @Column({ type: 'varchar', nullable: true })
  linkedMocDocumentId: string | null;

  @Column({ default: 'none' })
  linkedMocType: 'workflow' | 'document' | 'none';

  @Column({ type: 'varchar', nullable: true })
  linkedMocNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  linkedMocTitle: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
