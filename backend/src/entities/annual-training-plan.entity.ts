import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('annual_training_plans')
export class AnnualTrainingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  topic: string;

  @Column({ type: 'int' })
  month: number; // 0-11

  @Column({ type: 'int' })
  year: number;

  @Column({ nullable: true })
  department: string;

  @CreateDateColumn()
  createdAt: Date;
}
