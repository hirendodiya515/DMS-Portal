import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { AuditLog } from './audit-log.entity';

@Entity('moc_records')
export class MocRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    mocNo: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'requisitionById' })
    requisitionBy: User;

    @Column()
    requisitionById: string;

    @Column({ nullable: true })
    requisitionByName: string;

    @Column()
    department: string;

    @Column({ type: 'date' })
    requestDate: Date;

    @Column({ nullable: true })
    mocMode: string;

    @Column()
    productProcess: string;

    @Column({ type: 'text' })
    description: string;

    @Column('simple-array')
    classification: string[]; // man, machine, material, method, other

    @Column({ type: 'text', nullable: true })
    particular: string;

    @Column({ type: 'text' })
    currentStatus: string;

    @Column({ type: 'text' })
    changesRequired: string;

    @Column({ type: 'text' })
    reasonForChange: string;

    @Column({ nullable: true })
    changeAssessmentFile: string;

    @Column({ nullable: true })
    hodName: string;

    // Section 2: JSON fields for tables
    @Column({ type: 'jsonb', nullable: true })
    actionPlan: any[];

    @Column({ type: 'jsonb', nullable: true })
    trialDetails: any[];

    @Column({ type: 'jsonb', nullable: true })
    affectedDocs: any[];

    // Section 3: Implementation
    @Column({ nullable: true })
    pictureBefore: string;

    @Column({ nullable: true })
    pictureAfter: string;

    @Column({ type: 'jsonb', nullable: true })
    teamMembers: any[];

    @Column({ default: false })
    customerApprovalRequired: boolean;

    // Approvals
    @Column({ type: 'jsonb', nullable: true })
    hodApproval: {
        name: string;
        designation: string;
        sign: string;
        remarks: string;
        status: 'pending' | 'approved' | 'rejected';
        date: Date;
    };

    @Column({ type: 'jsonb', nullable: true })
    plantHeadApproval: {
        name: string;
        designation: string;
        sign: string;
        remarks: string;
        status: 'pending' | 'approved' | 'rejected';
        date: Date;
    };

    @Column({ type: 'jsonb', nullable: true })
    ceoApproval: {
        name: string;
        designation: string;
        sign: string;
        remarks: string;
        status: 'pending' | 'approved' | 'rejected';
        date: Date;
    };

    @Column({ type: 'jsonb', nullable: true })
    qaApproval: {
        name: string;
        designation: string;
        sign: string;
        remarks: string;
        status: 'pending' | 'approved' | 'rejected';
        date: Date;
    };

    @Column({ type: 'jsonb', nullable: true })
    ehsApproval: {
        name: string;
        designation: string;
        sign: string;
        remarks: string;
        status: 'pending' | 'approved' | 'rejected';
        date: Date;
    };

    @Column({
        type: 'varchar',
        default: 'Draft'
    })
    status: string; // Draft, Pending HOD, Pending QA/EHS, Pending Customer, Closed

    @Column({ nullable: true })
    currentApprover: string;

    @OneToMany(() => AuditLog, (log) => log.moc)
    auditLogs: AuditLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
