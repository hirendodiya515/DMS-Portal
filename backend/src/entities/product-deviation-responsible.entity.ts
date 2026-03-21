import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ProductDeviation } from './product-deviation.entity';
import { User } from './user.entity';

@Entity('product_deviation_responsibles')
export class ProductDeviationResponsible {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ProductDeviation, (deviation) => deviation.responsiblePersons, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productDeviationId' })
    productDeviation: ProductDeviation;

    @Column()
    productDeviationId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @Column({ type: 'timestamp', nullable: true })
    signedAt: Date;
}
