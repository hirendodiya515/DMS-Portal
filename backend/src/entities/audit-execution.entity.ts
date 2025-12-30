import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { AuditSchedule } from './audit-schedule.entity';

export interface AuditEntry {
  id: string; // Internal ID for UI keying
  title: string;
  docNumber: string;
  observation: string;
  clause: string;
  status: 'OK' | 'AFI' | 'NC' | '';
  ncStatement?: string;
  requirement?: string;
  targetDate?: string;
}

@Entity('audit_executions')
export class AuditExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  date: Date;

  @Column({ default: 'Draft' })
  status: 'Draft' | 'Submitted';

  @OneToOne(() => AuditSchedule)
  @JoinColumn()
  schedule: AuditSchedule;

  @Column({ nullable: true })
  scheduleId: string;

  @Column('jsonb', { default: [] })
  entries: AuditEntry[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
