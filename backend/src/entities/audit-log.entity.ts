import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';
import { Objective } from './objective.entity';
import { Risk } from './risk.entity';
import { HiraRisk } from './hira-risk.entity';
import { EaaRisk } from './eaa-risk.entity';
import { QraRisk } from './qra-risk.entity';
import { Pfmea } from './pfmea.entity';
import { ProductDeviation } from './product-deviation.entity';
import { ProcessDeviation } from './process-deviation.entity';

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
    PRODUCT_DEVIATION_CREATE = 'product_deviation_create',
    PRODUCT_DEVIATION_UPDATE = 'product_deviation_update',
    PRODUCT_DEVIATION_SIGN = 'product_deviation_sign',
    PRODUCT_DEVIATION_REJECT = 'product_deviation_reject',
    PROCESS_DEVIATION_CREATE = 'process_deviation_create',
    PROCESS_DEVIATION_UPDATE = 'process_deviation_update',
    PROCESS_DEVIATION_SIGN = 'process_deviation_sign',
    PROCESS_DEVIATION_REJECT = 'process_deviation_reject',
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

    @ManyToOne(() => Objective, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'objectiveId' })
    objective: Objective;

    @Column({ nullable: true })
    objectiveId: string;

    @ManyToOne(() => Risk, { nullable: true })
    @JoinColumn({ name: 'riskId' })
    risk: Risk;

    @Column({ nullable: true })
    riskId: string;

    @ManyToOne(() => HiraRisk, (risk) => risk.auditLogs, { nullable: true })
    @JoinColumn({ name: 'hiraRiskId' })
    hiraRisk: HiraRisk;

    @Column({ nullable: true })
    hiraRiskId: string;

    @ManyToOne(() => EaaRisk, (risk) => risk.auditLogs, { nullable: true })
    @JoinColumn({ name: 'eaaRiskId' })
    eaaRisk: EaaRisk;

    @Column({ nullable: true })
    eaaRiskId: string;

    @ManyToOne(() => QraRisk, (risk) => risk.auditLogs, { nullable: true })
    @JoinColumn({ name: 'qraRiskId' })
    qraRisk: QraRisk;

    @Column({ nullable: true })
    qraRiskId: string;

    @ManyToOne(() => Pfmea, (pfmea) => pfmea.auditLogs, { nullable: true })
    @JoinColumn({ name: 'pfmeaId' })
    pfmea: Pfmea;

    @Column({ nullable: true })
    pfmeaId: string;

    @ManyToOne(() => ProductDeviation, (deviation) => deviation.auditLogs, { nullable: true })
    @JoinColumn({ name: 'productDeviationId' })
    productDeviation: ProductDeviation;

    @Column({ nullable: true })
    productDeviationId: string;

    @ManyToOne(() => ProcessDeviation, (deviation) => deviation.auditLogs, { nullable: true })
    @JoinColumn({ name: 'processDeviationId' })
    processDeviation: ProcessDeviation;

    @Column({ nullable: true })
    processDeviationId: string;

    @Column({ type: 'text', nullable: true })
    details: string;

    @Column({ nullable: true })
    ipAddress: string;

    @CreateDateColumn()
    timestamp: Date;
}
