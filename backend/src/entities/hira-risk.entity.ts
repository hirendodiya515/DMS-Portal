import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';
import { AuditLog } from './audit-log.entity';
import { RiskAssessmentItem } from './risk-assessment-item.entity';
import { RiskStatus, RiskLevel } from './risk.enums';


@Entity('hira_risks')
export class HiraRisk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  riskNumber: string; // H-001, H-002, etc.

  @Column()
  activity: string;

  @Column({ nullable: true })
  task: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  identificationDate: Date;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  maxRiskLevel: RiskLevel;

  @OneToMany(() => RiskAssessmentItem, (item) => item.hiraRisk, { cascade: true, eager: true })
  items: RiskAssessmentItem[];

  // Workflow
  @Column({
    type: 'enum',
    enum: RiskStatus,
    default: RiskStatus.DRAFT,
  })
  status: RiskStatus;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @Column({ nullable: true })
  reviewerId: string;

  @Column({ type: 'date', nullable: true })
  reviewDate: Date;

  @Column('text', { nullable: true })
  reviewComments: string;

  @ManyToMany(() => Document)
  @JoinTable({
    name: 'hira_risk_documents',
    joinColumn: { name: 'riskId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'documentId', referencedColumnName: 'id' },
  })
  relatedDocuments: Document[];

  @OneToMany(() => AuditLog, (log) => log.hiraRisk)
  auditLogs: AuditLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
