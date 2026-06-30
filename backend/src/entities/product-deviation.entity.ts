import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { ProductDeviationResponsible } from './product-deviation-responsible.entity';
import { AuditLog } from './audit-log.entity';

export enum ProductDeviationStatus {
    OPEN = 'OPEN',
    PENDING_MARKETING = 'PENDING_MARKETING',
    PENDING_PLANT_HEAD = 'PENDING_PLANT_HEAD',
    PENDING_QUALITY_HEAD = 'PENDING_QUALITY_HEAD',
    CLOSED = 'CLOSED',
    REJECTED = 'REJECTED'
}

@Entity('product_deviations')
export class ProductDeviation {
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

    @Column({ type: 'numeric', nullable: true })
    totalQuantityProduced: number;

    @Column({ type: 'numeric', nullable: true })
    quantityUnderDeviation: number;

    @Column({ type: 'numeric', nullable: true })
    quantityUnderDeviationPcs: number;

    @Column({ nullable: true })
    natureOfDeviation: string;

    @Column({ nullable: true })
    initiatorName: string;

    @Column({ type: 'text' })
    detailsOfDeviation: string;

    @Column({ type: 'text', nullable: true })
    rootCauseAnalysis: string;

    @Column({ type: 'text', nullable: true })
    containmentAction: string;

    @Column({ type: 'text', nullable: true })
    correctiveAction: string;

    @Column({ type: 'text', nullable: true })
    disposalAction: string;

    @Column({ type: 'text', nullable: true })
    marketingRemarks: string;

    @Column({
        type: 'enum',
        enum: ProductDeviationStatus,
        default: ProductDeviationStatus.OPEN,
    })
    status: ProductDeviationStatus;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'createdById' })
    createdBy: User;

    @Column()
    createdById: string;

    @OneToMany(() => ProductDeviationResponsible, (resp) => resp.productDeviation, { cascade: true })
    responsiblePersons: ProductDeviationResponsible[];

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'marketingPersonId' })
    marketingPerson: User;

    @Column({ nullable: true })
    marketingPersonId: string;

    @Column({ type: 'timestamp', nullable: true })
    marketingSignedAt: Date;

    @Column({ type: 'text', nullable: true })
    plantHeadRemarks: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'plantHeadId' })
    plantHead: User;

    @Column({ nullable: true })
    plantHeadId: string;

    @Column({ type: 'timestamp', nullable: true })
    plantHeadSignedAt: Date;

    @Column({ type: 'text', nullable: true })
    ceoRemarks: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'ceoId' })
    ceo: User;

    @Column({ nullable: true })
    ceoId: string;

    @Column({ type: 'timestamp', nullable: true })
    ceoSignedAt: Date;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'qualityHeadId' })
    qualityHead: User;

    @Column({ nullable: true })
    qualityHeadId: string;

    @Column({ type: 'text', nullable: true })
    qualityHeadRemarks: string;

    @Column({ type: 'timestamp', nullable: true })
    qualityHeadSignedAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    attachments: { name: string; fileData: string }[];

    @Column({ type: 'jsonb', nullable: true })
    marketingAttachments: { name: string; fileData: string }[];

    @Column({ type: 'jsonb', nullable: true })
    ceoAttachments: { name: string; fileData: string }[];

    @Column({ type: 'jsonb', nullable: true })
    plantHeadAttachments: { name: string; fileData: string }[];

    @Column({ type: 'jsonb', nullable: true })
    qualityHeadAttachments: { name: string; fileData: string }[];

    @Column({ type: 'jsonb', nullable: true })
    actionPlanAttachments: { name: string; fileData: string }[];

    @Column({ default: false })
    isDeleted: boolean;

    @OneToMany(() => AuditLog, (log) => log.productDeviation)
    auditLogs: AuditLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
