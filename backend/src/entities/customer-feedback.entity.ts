import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { CorrectiveActionRequest } from './corrective-action-request.entity';

@Entity('customer_feedback')
export class CustomerFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  companyName: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 255 })
  contactPerson: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  product: string;

  @Column({ name: 'quality_rating', type: 'int' })
  qualityRating: number;

  @Column({ name: 'delivery_rating', type: 'int' })
  deliveryRating: number;

  @Column({ name: 'packaging_rating', type: 'int' })
  packagingRating: number;

  @Column({ name: 'support_rating', type: 'int' })
  supportRating: number;

  @Column({ name: 'response_rating', type: 'int' })
  responseRating: number;

  @Column({ name: 'complaint_rating', type: 'int' })
  complaintRating: number;

  @Column({ name: 'documentation_rating', type: 'int' })
  documentationRating: number;

  @Column({ name: 'overall_rating', type: 'int' })
  overallRating: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  recommendation: string;

  @Column({ type: 'text', nullable: true })
  suggestion: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => CorrectiveActionRequest, car => car.feedback)
  cars: CorrectiveActionRequest[];
}
