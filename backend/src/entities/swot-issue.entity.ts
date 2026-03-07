import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('swot_issues')
export class SwotIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';

  @Column('text')
  text: string;

  @Column()
  impact: 'low' | 'medium' | 'high';

  @Column('simple-array', { nullable: true })
  standards: string[];

  @Column({ default: false })
  isConverted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
