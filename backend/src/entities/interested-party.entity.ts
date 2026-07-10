import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('interested_parties')
export class InterestedParty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('simple-array', { nullable: true })
  standards: string[];

  @Column('text')
  needs: string;

  @Column()
  risk: 'Low' | 'Medium' | 'High';

  @Column('simple-array', { nullable: true })
  actions: string[];

  @Column({ nullable: true })
  responsible: string;

  @Column({ default: 'Internal' })
  category: 'Internal' | 'External';

  @Column('text', { nullable: true })
  complianceObligations: string;

  @Column('text', { nullable: true })
  associatedRisks: string;

  @Column('text', { nullable: true })
  associatedOpportunities: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
