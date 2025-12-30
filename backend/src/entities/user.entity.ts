import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';
import { AuditLog } from './audit-log.entity';
import { JobRole } from './job-role.entity';

export enum UserRole {
    ADMIN = 'admin',
    COMPLIANCE_MANAGER = 'compliance_manager',
    DEPT_HEAD = 'dept_head',
    CREATOR = 'creator',
    REVIEWER = 'reviewer',
    VIEWER = 'viewer',
    AUDITOR = 'auditor',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.VIEWER,
    })
    role: UserRole;

    @Column({ nullable: true })
    department: string;



    @Column({ nullable: true })
    jobRoleId: string;

    @ManyToOne(() => JobRole, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'jobRoleId' })
    jobRole: JobRole;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Document, document => document.owner)
    documents: Document[];

    @OneToMany(() => AuditLog, log => log.user)
    auditLogs: AuditLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
