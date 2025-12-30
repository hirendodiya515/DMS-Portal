import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';

export enum ObjectiveType {
  QUALITY = 'quality',
  ENVIRONMENTAL = 'environmental',
  SAFETY = 'safety',
}

export enum ObjectiveStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export enum ObjectiveUnit {
  PERCENTAGE = 'percentage',
  NUMBER = 'number',
  CURRENCY = 'currency',
  RATING = 'rating',
  DAYS = 'days',
  COUNT = 'count',
}

export enum ObjectiveFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

@Entity('objectives')
export class Objective {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  objectiveNumber: string; // OBJ-001, OBJ-002, etc.

  @Column({ nullable: true, default: '' })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ObjectiveType,
    default: ObjectiveType.QUALITY,
  })
  type: ObjectiveType;

  @Column({ nullable: true })
  department: string;

  @Column({
    type: 'enum',
    enum: ObjectiveStatus,
    default: ObjectiveStatus.ACTIVE,
  })
  status: ObjectiveStatus;

  // Merged KPI fields - UOM is stored as string (from master data)
  @Column({ default: 'Number' })
  uom: string; // Unit of Measure - configurable from master data

  @Column({
    type: 'enum',
    enum: ObjectiveFrequency,
    default: ObjectiveFrequency.MONTHLY,
  })
  frequency: ObjectiveFrequency;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  target: number;

  @Column({ default: true })
  higherIsBetter: boolean;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany('ObjectiveMeasurement', 'objective', { cascade: true })
  measurements: any[];

  @ManyToMany(() => Document)
  @JoinTable({
    name: 'objective_documents',
    joinColumn: { name: 'objectiveId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'documentId', referencedColumnName: 'id' },
  })
  relatedDocuments: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
