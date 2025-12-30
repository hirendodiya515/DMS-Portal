import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Objective } from './objective.entity';
import { User } from './user.entity';

@Entity('objective_measurements')
export class ObjectiveMeasurement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  actualValue: number;

  @Column({ type: 'date' })
  measurementDate: Date;

  @Column('text', { nullable: true })
  remarks: string;

  @ManyToOne(() => Objective, (objective) => objective.measurements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'objectiveId' })
  objective: Objective;

  @Column()
  objectiveId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @Column()
  recordedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
