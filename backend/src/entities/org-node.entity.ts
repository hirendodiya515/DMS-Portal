import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('org_nodes')
export class OrgNode {
    @PrimaryColumn()
    id: string; // User provided ID from Excel

    @Column({ nullable: true })
    parentId: string; // ID of the manager

    @Column()
    name: string;

    @Column({ nullable: true })
    designation: string;

    @Column({ nullable: true })
    department: string;

    @Column({ nullable: true })
    photoUrl: string;

    @Column({ nullable: true })
    jobRoleId: string;

    @ManyToOne('JobRole', { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'jobRoleId' })
    jobRole: any;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
