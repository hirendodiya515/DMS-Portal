import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Risk } from './risk.entity';
import { RiskLevel } from './risk.enums';
import { HiraRisk } from './hira-risk.entity';
import { EaaRisk } from './eaa-risk.entity';
import { QraRisk } from './qra-risk.entity';

@Entity('risk_assessment_items')
export class RiskAssessmentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hazardOrAspect: string; // Hazard (HIRA), Aspect (EAA), Failure Mode (QRA)

  @Column('text', { nullable: true })
  subActivity: string; // The specific sub-activity this hazard belongs to

  @Column('text', { nullable: true })
  consequenceOrImpact: string; // Risk/Consequence (HIRA), Impact (EAA), Potential Impact (QRA)

  // Initial Assessment
  @Column('int', { default: 1 })
  likelihood: number;

  @Column('int', { default: 1 })
  severity: number;

  @Column('int', { default: 1 })
  rating: number;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  level: RiskLevel;

  // Controls
  @Column('text', { nullable: true })
  currentControls: string;

  @Column('text', { nullable: true })
  proposedActions: string;

  // Residual Risk
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

  // Generic Parent Relation
  @ManyToOne(() => Risk, (risk) => risk.items, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'riskId' })
  risk: Risk;

  @Column({ nullable: true })
  riskId: string;

  // Specific Parent Relations
  @ManyToOne(() => HiraRisk, (hira) => hira.items, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'hiraRiskId' })
  hiraRisk: HiraRisk;

  @Column({ nullable: true })
  hiraRiskId: string;

  @ManyToOne(() => EaaRisk, (eaa) => eaa.items, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'eaaRiskId' })
  eaaRisk: EaaRisk;

  @Column({ nullable: true })
  eaaRiskId: string;

  @ManyToOne(() => QraRisk, (qra) => qra.items, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'qraRiskId' })
  qraRisk: QraRisk;

  @Column({ nullable: true })
  qraRiskId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
