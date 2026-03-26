import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { TrainingCalendar } from './training-calendar.entity';

@Entity('training_attendance')
export class TrainingAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  trainingId: string;

  @ManyToOne(() => TrainingCalendar, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trainingId' })
  training: TrainingCalendar;

  @Column()
  employeeId: string;

  @Column()
  employeeName: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  cloudAttendanceId: string; // ID from Neon

  @Column({ default: false })
  syncedFromCloud: boolean;

  @CreateDateColumn()
  markedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  feedback: any;

  @Column({ nullable: true })
  department: string;
}
