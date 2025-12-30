import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrgNode } from './org-node.entity';
import { TrainingProgram } from './training-program.entity';

export enum TrainingStatus {
    ASSIGNED = 'Assigned',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    OVERDUE = 'Overdue',
}

@Entity('training_plans')
export class TrainingPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    employeeId: string;

    @ManyToOne(() => OrgNode, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employeeId' })
    employee: OrgNode;

    @Column()
    trainingProgramId: string;

    @ManyToOne(() => TrainingProgram, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'trainingProgramId' })
    trainingProgram: TrainingProgram;

    @Column({
        type: 'enum',
        enum: TrainingStatus,
        default: TrainingStatus.ASSIGNED,
    })
    status: TrainingStatus;

    @Column({ type: 'date', nullable: true })
    dueDate: string;

    @Column({ type: 'date', nullable: true })
    completionDate: string;

    @CreateDateColumn()
    assignedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
