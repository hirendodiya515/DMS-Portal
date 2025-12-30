import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Competency } from './competency.entity';

@Entity('training_programs')
export class TrainingProgram {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    provider: string; // e.g., "Udemy", "Internal"

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    targetCompetencyId: string;

    @ManyToOne(() => Competency, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'targetCompetencyId' })
    targetCompetency: Competency;

    @Column({ nullable: true }) // In hours or days
    duration: string;

    @CreateDateColumn()
    createdAt: Date;
}
