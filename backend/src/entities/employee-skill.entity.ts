import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { OrgNode } from './org-node.entity';
import { Competency } from './competency.entity';

@Entity('employee_skills')
export class EmployeeSkill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    employeeId: string;

    @ManyToOne(() => OrgNode, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employeeId' })
    employee: OrgNode;

    @Column()
    competencyId: string;

    @ManyToOne(() => Competency, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'competencyId' })
    competency: Competency;

    @Column({ type: 'int' })
    currentLevel: number;

    @UpdateDateColumn()
    lastAssessedDate: Date;
}
