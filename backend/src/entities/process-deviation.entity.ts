import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { ProcessDeviationResponsible } from './process-deviation-responsible.entity';
import { AuditLog } from './audit-log.entity';

export enum ProcessDeviationStatus {
    OPEN = 'OPEN',
    PENDING_FUNCTIONAL_HEAD = 'PENDING_FUNCTIONAL_HEAD',
    PENDING_QA_HEAD = 'PENDING_QA_HEAD',
    PENDING_PLANT_HEAD = 'PENDING_PLANT_HEAD',
    PENDING_PROCESS_HEAD = 'PENDING_PROCESS_HEAD',
    PENDING_CEO = 'PENDING_CEO',
    CLOSED = 'CLOSED',
    REJECTED = 'REJECTED'
}

@Entity('process_deviations')
export class ProcessDeviation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    serialNumber: string;

    @Column()
    line: string;

    @Column({ type: 'date', nullable: true })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    endDate: Date;

    @Column({ type: 'text', nullable: true })
    parameterUnderDeviation: string; // Parameter Under Deviation

    @Column({ type: 'text', nullable: true })
    parameterSpecification: string; // Specification of Parameter

    @Column({ nullable: true })
    natureOfDeviation: string;

    @Column({ type: 'text' })
    detailsOfDeviation: string;

    @Column()
    department: string;

    @Column({ type: 'text', nullable: true })
    rootCauseAnalysis: string;

    @Column({ type: 'text', nullable: true })
    containmentAction: string;

    @Column({ type: 'text', nullable: true })
    correctiveAction: string;

    @Column({
        type: 'enum',
        enum: ProcessDeviationStatus,
        default: ProcessDeviationStatus.OPEN,
    })
    status: ProcessDeviationStatus;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'createdById' })
    createdBy: User;

    @Column()
    createdById: string;

    @OneToMany(() => ProcessDeviationResponsible, (resp) => resp.processDeviation, { cascade: true })
    responsiblePersons: ProcessDeviationResponsible[];

    // 1. Functional Head
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'functionalHeadId' })
    functionalHead: User;

    @Column({ nullable: true })
    functionalHeadId: string;

    @Column({ type: 'text', nullable: true })
    functionalHeadRemarks: string;

    @Column({ type: 'timestamp', nullable: true })
    functionalHeadSignedAt: Date;

    // 2. QA Head
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'qaHeadId' })
    qaHead: User;

    @Column({ nullable: true })
    qaHeadId: string;

    @Column({ type: 'text', nullable: true })
    qaHeadRemarks: string;

    @Column({ type: 'timestamp', nullable: true })
    qaHeadSignedAt: Date;

    // 3. Plant Head
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'plantHeadId' })
    plantHead: User;

    @Column({ nullable: true })
    plantHeadId: string;

    @Column({ type: 'text', nullable: true })
    plantHeadRemarks: string;

    @Column({ type: 'timestamp', nullable: true })
    plantHeadSignedAt: Date;

    // 4. Process Head
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'processHeadId' })
    processHead: User;

    @Column({ nullable: true })
    processHeadId: string;

    @Column({ type: 'text', nullable: true })
    processHeadRemarks: string;

    @Column({ type: 'timestamp', nullable: true })
    processHeadSignedAt: Date;

    // 5. CEO
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'ceoId' })
    ceo: User;

    @Column({ nullable: true })
    ceoId: string;

    @Column({ type: 'text', nullable: true })
    ceoRemarks: string;

    @Column({ type: 'timestamp', nullable: true })
    ceoSignedAt: Date;

    @OneToMany(() => AuditLog, (log) => log.processDeviation)
    auditLogs: AuditLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
