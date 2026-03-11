import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { AuditLog } from './audit-log.entity';
import { PfmeaWorksheetRow } from './pfmea-worksheet-row.entity';
import { RiskStatus } from './risk.enums';

@Entity('pfmeas')
export class Pfmea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  pfmeaNumber: string;

  @Column()
  projectName: string;
  
  @Column()
  processName: string;

  @Column({ default: '00' })
  revisionNumber: string;

  @Column({ type: 'text', nullable: true })
  revisionSummary: string;

  @Column({ type: 'date', nullable: true })
  revisionDate: Date;

  @Column({
    type: 'enum',
    enum: RiskStatus,
    default: RiskStatus.DRAFT,
  })
  status: RiskStatus;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ nullable: true })
  ownerId: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @Column({ nullable: true })
  reviewerId: string;

  @OneToMany(() => PfmeaWorksheetRow, (row) => row.pfmea, { cascade: true, eager: true })
  worksheetRows: PfmeaWorksheetRow[];

  @OneToMany(() => AuditLog, (log) => log.pfmea)
  auditLogs: AuditLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
