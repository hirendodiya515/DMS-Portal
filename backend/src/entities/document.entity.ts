import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { DocumentVersion } from './document-version.entity';
import { AuditLog } from './audit-log.entity';

export enum DocumentStatus {
    DRAFT = 'draft',
    UNDER_REVIEW = 'under_review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    ARCHIVED = 'archived',
}

export enum DocumentType {
    POLICY = 'policy',
    PROCEDURE = 'procedure',
    WORK_INSTRUCTION = 'work_instruction',
    FORM = 'form',
    RECORD = 'record',
    OTHER = 'other',
}

@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    documentNumber: string;

    @Column({ type: 'text', nullable: true })
    description: string;



    @Column({
        type: 'varchar',
        default: 'other',
    })
    type: string;

    @Column('simple-array', { nullable: true })
    departments: string[];

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({
        type: 'enum',
        enum: DocumentStatus,
        default: DocumentStatus.DRAFT,
    })
    status: DocumentStatus;

    @Column({ type: 'date', nullable: true })
    effectiveDate: Date;

    @Column({ type: 'date', nullable: true })
    reviewDate: Date;

    @Column({ type: 'date', nullable: true })
    expiryDate: Date;

    @ManyToOne(() => User, user => user.documents)
    @JoinColumn({ name: 'ownerId' })
    owner: User;

    @Column()
    ownerId: string;

    @OneToMany(() => DocumentVersion, version => version.document)
    versions: DocumentVersion[];

    @Column({ nullable: true })
    currentVersionId: string;

    @Column({ default: 1 })
    version: number;

    @OneToMany(() => AuditLog, log => log.document)
    auditLogs: AuditLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
