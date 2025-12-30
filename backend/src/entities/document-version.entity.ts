import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_versions')
export class DocumentVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Document, document => document.versions)
    @JoinColumn({ name: 'documentId' })
    document: Document;

    @Column()
    documentId: string;

    @Column()
    versionNumber: number;

    @Column()
    filePath: string;

    @Column()
    fileName: string;

    @Column()
    mimeType: string;

    @Column({ type: 'bigint' })
    fileSize: number;

    @Column({ nullable: true })
    uploadedBy: string;

    @Column({ type: 'text', nullable: true })
    changeNotes: string;

    @Column({ type: 'timestamp', nullable: true })
    effectiveDate: Date;

    @CreateDateColumn()
    createdAt: Date;
}
