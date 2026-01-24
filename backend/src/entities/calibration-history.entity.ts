import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Equipment } from './equipment.entity';
import { User } from './user.entity';

@Entity('calibration_history')
export class CalibrationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, equipment => equipment.calibrationHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipmentId' })
  equipment: Equipment;

  @Column()
  equipmentId: string;

  @Column({ type: 'date' })
  calibrationDate: Date;

  @Column()
  certificateNumber: string;

  @Column()
  certifiedBy: string; // Company/person who performed calibration

  @Column('text', { nullable: true })
  remarks: string;

  @Column({ nullable: true })
  certificatePath: string; // Path to uploaded certificate file

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column()
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
