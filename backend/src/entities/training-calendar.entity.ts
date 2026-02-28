import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany
} from 'typeorm';

@Entity('training_calendar')
export class TrainingCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  trainingName: string;

  @Column({ type: 'date' })
  trainingDate: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  startTime: string; // "09:00"

  @Column({ nullable: true })
  endTime: string; // "11:00"

  @Column({ unique: true })
  qrToken: string; // UUID used as QR identifier

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  cloudTrainingId: string; // ID returned by Neon after push

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
