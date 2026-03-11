import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pfmea } from './pfmea.entity';
import { RiskLevel } from './risk.enums';

@Entity('pfmea_worksheet_rows')
export class PfmeaWorksheetRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pfmea, pfmea => pfmea.worksheetRows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pfmeaId' })
  pfmea: Pfmea;

  @Column()
  pfmeaId: string;

  // Process & Failure Info
  @Column()
  processStep: string;
  
  @Column({ type: 'text', nullable: true })
  processDesc: string;

  @Column()
  failureMode: string;

  @Column({ type: 'text', nullable: true })
  effects: string;

  @Column({ nullable: true })
  effectClass: string;

  @Column({ type: 'text', nullable: true })
  causes: string;

  // Initial Metrics
  @Column({ type: 'int', default: 1 })
  severity: number;

  @Column({ type: 'int', default: 1 })
  occurrence: number;

  @Column({ type: 'text', nullable: true })
  prevention: string;

  @Column({ type: 'text', nullable: true })
  detectionControl: string;

  @Column({ type: 'int', default: 1 })
  detection: number;

  @Column({ type: 'int', default: 1 })
  rpn: number;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  riskLevel: RiskLevel;

  // Recommended Action & Follow up
  @Column({ type: 'text', nullable: true })
  action: string;

  @Column({ nullable: true })
  responsible: string;

  @Column({ type: 'date', nullable: true })
  targetDate: string;

  @Column({ default: 'Open' })
  status: string; // Open, In Progress, Completed

  // Post-Action Metrics
  @Column({ type: 'int', nullable: true })
  postS: number | null;

  @Column({ type: 'int', nullable: true })
  postO: number | null;

  @Column({ type: 'int', nullable: true })
  postD: number | null;

  @Column({ type: 'int', nullable: true })
  revisedRpn: number | null;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
