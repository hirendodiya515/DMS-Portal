import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { JobRole } from './job-role.entity';
import { Competency } from './competency.entity';

@Entity('competency_requirements')
export class CompetencyRequirement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    jobRoleId: string;

    @ManyToOne(() => JobRole, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'jobRoleId' })
    jobRole: JobRole;

    @Column()
    competencyId: string;

    @ManyToOne(() => Competency, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'competencyId' })
    competency: Competency;

    @Column({ type: 'int' })
    requiredLevel: number;
}
