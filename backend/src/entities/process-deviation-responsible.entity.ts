import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ProcessDeviation } from './process-deviation.entity';
import { User } from './user.entity';

@Entity('process_deviation_responsibles')
export class ProcessDeviationResponsible {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ProcessDeviation, (deviation) => deviation.responsiblePersons, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'processDeviationId' })
    processDeviation: ProcessDeviation;

    @Column()
    processDeviationId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @Column({ type: 'timestamp', nullable: true })
    signedAt: Date;
}
