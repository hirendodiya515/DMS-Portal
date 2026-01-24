import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { CalibrationHistory } from './calibration-history.entity';

export enum EquipmentStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

export enum CalibrationStatus {
  OK = 'ok',           // Within calibration date
  DUE = 'due',         // Overdue
  UPCOMING = 'upcoming', // Within alert days
}

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  equipmentNumber: string; // EQ-001, EQ-002, etc.

  @Column()
  name: string;

  @Column()
  equipmentId: string; // ID/Serial number

  @Column()
  make: string; // Manufacturer

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  line: string; // Production line/area

  @Column()
  location: string;

  @Column()
  department: string;

  @Column({ type: 'date', nullable: true })
  purchaseDate: Date;

  @Column({ type: 'date', nullable: true })
  lastCalibrationDate: Date;

  @Column({ type: 'date' })
  nextCalibrationDate: Date;

  @Column('int') // in days
  calibrationFrequency: number;

  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.ACTIVE,
  })
  status: EquipmentStatus;

  @Column('text', { nullable: true })
  remark: string;

  @Column('int', { default: 7 }) // Days before due date to trigger alert
  alertDaysBeforeDue: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  @OneToMany(() => CalibrationHistory, history => history.equipment)
  calibrationHistory: CalibrationHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to calculate calibration status
  getCalibrationStatus(): CalibrationStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextDue = new Date(this.nextCalibrationDate);
    nextDue.setHours(0, 0, 0, 0);

    if (nextDue < today) {
      return CalibrationStatus.DUE;
    }

    const alertDate = new Date(nextDue);
    alertDate.setDate(alertDate.getDate() - this.alertDaysBeforeDue);

    if (today >= alertDate && today < nextDue) {
      return CalibrationStatus.UPCOMING;
    }

    return CalibrationStatus.OK;
  }
}
