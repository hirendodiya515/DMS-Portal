import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { AuditParticipant } from './audit-participant.entity';

export enum AuditScheduleStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

@Entity('audit_schedules')
export class AuditSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  department: string;

  @Column()
  date: Date;

  @Column('text')
  scope: string;

  @Column({
    type: 'varchar',
    default: AuditScheduleStatus.PENDING,
  })
  status: AuditScheduleStatus;

  // Many-to-Many relationship with Auditors
  @ManyToMany(() => AuditParticipant)
  @JoinTable({
    name: 'audit_schedule_auditors', // Junction table name
    joinColumn: {
      name: 'scheduleId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'auditorId',
      referencedColumnName: 'id',
    },
  })
  auditors: AuditParticipant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
