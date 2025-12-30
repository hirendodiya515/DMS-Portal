import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('audit_plans')
export class AuditPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  department: string;

  @Column()
  month: string; // Format: YYYY-MM

  @Column({ default: false })
  isPlanned: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  outcome: 'actual' | 'cancelled' | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
