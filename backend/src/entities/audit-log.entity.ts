import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';
import { Objective } from './objective.entity';
import { Risk } from './risk.entity';

export enum AuditAction {
    CREATE = 'create',
    UPDATE = 'update',
    VIEW = 'view',
    DOWNLOAD = 'download',
    SUBMIT = 'submit',
    APPROVE = 'approve',
    REJECT = 'reject',
    ARCHIVE = 'archive',
    DELETE = 'delete',
    ORG_CHART_UPDATE = 'org_chart_update',
    MEASUREMENT_ADD = 'measurement_add',
    MEASUREMENT_DELETE = 'measurement_delete',
    CLOSE = 'close',
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    action: AuditAction;

    @ManyToOne(() => User, user => user.auditLogs, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    userId: string;

    @ManyToOne(() => Document, document => document.auditLogs, { nullable: true })
    @JoinColumn({ name: 'documentId' })
    document: Document;

    @Column({ nullable: true })
    documentId: string;

    @ManyToOne(() => Objective, { nullable: true })
    @JoinColumn({ name: 'objectiveId' })
    objective: Objective;

    @Column({ nullable: true })
    objectiveId: string;

    @ManyToOne(() => Risk, { nullable: true })
    @JoinColumn({ name: 'riskId' })
    risk: Risk;

    @Column({ nullable: true })
    riskId: string;

    @Column({ type: 'text', nullable: true })
    details: string;

    @Column({ nullable: true })
    ipAddress: string;

    @CreateDateColumn()
    timestamp: Date;
}
