import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, ManyToOne } from 'typeorm';
import { CustomerFeedback } from './customer-feedback.entity';

@Entity('corrective_action_requests')
export class CorrectiveActionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'feedback_id', type: 'uuid' })
  feedbackId: string;

  @ManyToOne(() => CustomerFeedback, feedback => feedback.cars, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feedback_id' })
  feedback: CustomerFeedback;

  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName: string;

  @Column({ name: 'issue_description', type: 'varchar', length: 255 })
  issueDescription: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ name: 'action_owner', type: 'varchar', length: 255 })
  actionOwner: string;

  @Column({ type: 'timestamp' })
  deadline: Date;

  @Column({ type: 'varchar', length: 50, default: 'Open' })
  status: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
