import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CompetencyCategory {
    TECHNICAL = 'Technical',
    BEHAVIORAL = 'Behavioral',
    LEADERSHIP = 'Leadership',
    DOMAIN = 'Domain',
}

@Entity('competencies')
export class Competency {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: CompetencyCategory,
        default: CompetencyCategory.TECHNICAL,
    })
    category: CompetencyCategory;

    @Column({ default: 5 })
    maxLevel: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
