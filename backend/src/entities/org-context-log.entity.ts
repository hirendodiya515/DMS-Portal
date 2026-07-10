import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('org_context_logs')
export class OrgContextLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tab: 'swot' | 'party' | 'scope' | 'general';

  @Column()
  action: 'add' | 'edit' | 'delete' | 'review';

  @Column({ nullable: true })
  itemName: string;

  @Column('text')
  details: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  timestamp: Date;
}
