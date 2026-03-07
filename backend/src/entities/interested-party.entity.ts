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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
