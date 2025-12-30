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
} from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';

export enum RiskType {
  QRA = 'qra',      // Quality Risk Assessment (ISO 9001)
  HIRA = 'hira',    // Hazard Identification & Risk Assessment (ISO 45001)
  EAA = 'eaa',      // Environmental Aspect Assessment (ISO 14001)
}

export enum RiskStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  CLOSED = 'closed',
}

export enum RiskLevel {
  LOW = 'low',         // 1-4
  MEDIUM = 'medium',   // 5-9
  HIGH = 'high',       // 10-16
  CRITICAL = 'critical', // 17-25
}

// Calculate risk level from rating
export function calculateRiskLevel(rating: number): RiskLevel {
  if (rating <= 4) return RiskLevel.LOW;
  if (rating <= 9) return RiskLevel.MEDIUM;
  if (rating <= 16) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

@Entity('risks')
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  riskNumber: string; // R-001, R-002, etc.

  @Column({
    type: 'enum',
    enum: RiskType,
    default: RiskType.QRA,
  })
  type: RiskType;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  source: string; // Where/how risk was identified

  @Column({ nullable: true })
  interestedParties: string; // Who is affected

  // Initial Risk Assessment
  @Column('int', { default: 1 })
  likelihood: number; // 1-5

  @Column('int', { default: 1 })
  severity: number; // 1-5

  @Column('int', { default: 1 })
  riskRating: number; // likelihood × severity (auto-calculated)

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  riskLevel: RiskLevel;

  // Controls
  @Column('text', { nullable: true })
  currentControls: string;

  @Column('text', { nullable: true })
  proposedActions: string;

  // Residual Risk (after controls)
  @Column('int', { nullable: true })
  residualLikelihood: number;

  @Column('int', { nullable: true })
  residualSeverity: number;

  @Column('int', { nullable: true })
  residualRating: number;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    nullable: true,
  })
  residualLevel: RiskLevel;

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
  reviewDate: Date; // Next review date

  @Column('text', { nullable: true })
  reviewComments: string;

  // Related Documents
  @ManyToMany(() => Document)
  @JoinTable({
    name: 'risk_documents',
    joinColumn: { name: 'riskId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'documentId', referencedColumnName: 'id' },
  })
  relatedDocuments: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
