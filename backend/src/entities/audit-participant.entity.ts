import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AuditParticipantType {
  AUDITOR = 'auditor',
  AUDITEE = 'auditee',
}

@Entity('audit_participants')
export class AuditParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar', // 'auditor' | 'auditee'
    default: AuditParticipantType.AUDITOR,
  })
  type: AuditParticipantType;

  @Column()
  name: string;

  @Column()
  email: string;

  // Specific to Auditee
  @Column({ nullable: true })
  department: string;

  // Specific to Auditor
  @Column('text', { nullable: true })
  remarks: string;

  // Certificate (for Auditor)
  @Column({ nullable: true })
  certificateName: string;

  @Column({ nullable: true })
  certificatePath: string; // Stored path or URL

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
