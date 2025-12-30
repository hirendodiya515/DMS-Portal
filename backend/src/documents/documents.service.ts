import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Document, DocumentStatus } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DocumentsService {
    private readonly logger = new Logger(DocumentsService.name);

    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(DocumentVersion)
        private versionRepository: Repository<DocumentVersion>,
        @InjectRepository(AuditLog)
        private auditRepository: Repository<AuditLog>,
        private notificationsService: NotificationsService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async checkReviewDates() {
        this.logger.log('Checking for expired document reviews...');
        const today = new Date();
        
        const expiredDocuments = await this.documentRepository.find({
            where: {
                status: DocumentStatus.APPROVED,
                reviewDate: LessThanOrEqual(today),
            },
            relations: ['owner'],
        });

        for (const doc of expiredDocuments) {
            this.logger.log(`Document ${doc.title} (ID: ${doc.id}) review date expired. Reverting to draft.`);
            
            // Revert to draft
            doc.status = DocumentStatus.DRAFT;
            await this.documentRepository.save(doc);

            // Log action
            await this.logAction(
                AuditAction.UPDATE, 
                doc.ownerId, 
                doc.id, 
                `Document next review date ${doc.reviewDate} passed. Automatically reverted to draft for review.`
            );

            // Notify owner
            await this.notificationsService.create(
                doc.ownerId,
                `Action Required: Review date for "${doc.title}" has passed. Document reverted to draft.`,
                doc.id
            );
        }
    }

    async create(createDocumentDto: any, userId: string) {
        const document = this.documentRepository.create({
            ...createDocumentDto,
            ownerId: userId,
            status: DocumentStatus.DRAFT,
            version: createDocumentDto.version || 1,
            departments: createDocumentDto.departments || [],
        } as Document);
        const savedDoc = await this.documentRepository.save(document);
        
        // Create initial version entry (placeholder or actual if file uploaded immediately)
        // For now, we just create the document record. File upload happens separately or we can handle it here if needed.
        
        await this.logAction(AuditAction.CREATE, userId, savedDoc.id, 'Document created');

        // Notify user
        await this.notificationsService.create(
            userId,
            `Document "${savedDoc.title}" created successfully.`,
            savedDoc.id
        );

        return savedDoc;
    }

    async findAll(filters: any) {
        const query = this.documentRepository.createQueryBuilder('document')
            .leftJoinAndSelect('document.owner', 'owner')
            .orderBy('document.updatedAt', 'DESC');

        if (filters.status && filters.status !== 'all') {
            query.andWhere('document.status = :status', { status: filters.status });
        }

        if (filters.search) {
            query.andWhere('(document.title ILIKE :search OR document.description ILIKE :search)', { search: `%${filters.search}%` });
        }

        if (filters.department && filters.department !== 'all') {
            query.andWhere('document.departments LIKE :department', { department: `%${filters.department}%` });
        }

        return query.getMany();
    }

    async findOne(id: string, userId: string) {
        const document = await this.documentRepository.findOne({
            where: { id },
            relations: ['owner', 'versions', 'auditLogs', 'auditLogs.user'],
            order: {
                versions: { versionNumber: 'DESC' },
                auditLogs: { timestamp: 'DESC' }
            }
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        return document;
    }

    async update(id: string, updateDocumentDto: any, user: any) {
        const document = await this.documentRepository.findOne({ where: { id } });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        // Allow Admin to update regardless of status, otherwise restrict to DRAFT
        if (user.role !== 'admin' && document.status !== DocumentStatus.DRAFT) {
            throw new ForbiddenException('Only draft documents can be updated');
        }

        Object.assign(document, updateDocumentDto);
        await this.documentRepository.save(document);

        await this.logAction(AuditAction.UPDATE, user.userId, id, 'Document updated');

        return document;
    }

    async remove(id: string, userId: string) {
        const document = await this.documentRepository.findOne({ where: { id } });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        // Delete related audit logs
        await this.auditRepository.delete({ documentId: id });

        // Delete related versions
        await this.versionRepository.delete({ documentId: id });

        // Finally delete the document
        await this.documentRepository.remove(document);
        
        return { message: 'Document deleted successfully' };
    }

    async submit(id: string, userId: string) {
        const document = await this.documentRepository.findOne({ where: { id }, relations: ['owner'] });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        if (document.status !== DocumentStatus.DRAFT) {
            throw new ForbiddenException('Only draft documents can be submitted');
        }

        document.status = DocumentStatus.UNDER_REVIEW;
        await this.documentRepository.save(document);

        await this.logAction(AuditAction.SUBMIT, userId, id, 'Document submitted for review');
        
        // Notify owner
        await this.notificationsService.create(
            document.ownerId, 
            `Your document "${document.title}" has been submitted for review.`,
            document.id
        );

        return document;
    }

    async approve(id: string, userId: string, comments?: string) {
        const document = await this.documentRepository.findOne({ where: { id }, relations: ['owner'] });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        if (document.status !== DocumentStatus.UNDER_REVIEW) {
            throw new ForbiddenException('Only documents under review can be approved');
        }

        document.status = DocumentStatus.APPROVED;
        await this.documentRepository.save(document);

        await this.logAction(AuditAction.APPROVE, userId, id, comments || 'Document approved');

        // Notify owner
        await this.notificationsService.create(
            document.ownerId, 
            `Good news! Your document "${document.title}" has been approved.`,
            document.id
        );

        return document;
    }

    async reject(id: string, userId: string, comments: string) {
        const document = await this.documentRepository.findOne({ where: { id }, relations: ['owner'] });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        if (document.status !== DocumentStatus.UNDER_REVIEW) {
            throw new ForbiddenException('Only documents under review can be rejected');
        }

        document.status = DocumentStatus.REJECTED;
        await this.documentRepository.save(document);

        await this.logAction(AuditAction.REJECT, userId, id, comments);

        // Notify owner
        await this.notificationsService.create(
            document.ownerId, 
            `Your document "${document.title}" has been rejected.`,
            document.id
        );

        return document;
    }

    async createVersion(documentId: string, versionData: Partial<DocumentVersion>) {
        if (!versionData.id) {
            throw new Error('Version ID is required');
        }

        const document = await this.documentRepository.findOne({
            where: { id: documentId },
            relations: ['versions'],
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        // Filter out the current version being updated (if it exists in the relations) to get accurate count of *previous* versions
        const previousVersions = document.versions.filter(v => v.id !== versionData.id);
        
        let versionNumber = 1;

        if (previousVersions.length > 0) {
            // If there are previous versions, increment from the highest one
            const maxVersion = Math.max(...previousVersions.map(v => v.versionNumber));
            versionNumber = maxVersion + 1;
        } else {
            // If this is the first version (e.g. initial file upload), respect the document's initial version setting
            // which was set during document creation.
             versionNumber = document.version || 1;
        }

        // Update the version entity
        await this.versionRepository.update(versionData.id, {
            versionNumber,
            documentId
        });
        
        const savedVersion = await this.versionRepository.findOne({ where: { id: versionData.id } });

        if (!savedVersion) {
            throw new NotFoundException('Version not found');
        }

        // Update document entity
        // We only update the document version if this new version is actually higher (which it should be by definition, but safe to match)
        // Or simply set it to the calculated versionNumber.
        await this.documentRepository.update(documentId, {
            currentVersionId: savedVersion.id,
            status: DocumentStatus.DRAFT,
            version: versionNumber
        });

        return savedVersion;
    }

    async getVersions(documentId: string, user: any) {
        const versions = await this.versionRepository.find({
            where: { documentId },
            order: { versionNumber: 'DESC' },
        });

        if (user.role === 'admin') {
            return versions;
        }

        // For non-admins, only return the current version (latest)
        // Or should we return the *approved* version? 
        // If the document is currently DRAFT (because of revision), the "current" version is the draft one.
        // The previous versions are the "archived" ones.
        // So non-admins should probably only see the latest version?
        // "old version should be archieved and only Admin can access it."
        
        // If I return only the first one (latest):
        return [versions[0]];
    }

    async getDashboardStats() {
        const total = await this.documentRepository.count();
        const draft = await this.documentRepository.count({ where: { status: DocumentStatus.DRAFT } });
        const underReview = await this.documentRepository.count({ where: { status: DocumentStatus.UNDER_REVIEW } });
        const approved = await this.documentRepository.count({ where: { status: DocumentStatus.APPROVED } });
        const rejected = await this.documentRepository.count({ where: { status: DocumentStatus.REJECTED } });

        return {
            total,
            byStatus: {
                draft,
                underReview,
                approved,
                rejected,
            },
        };
    }

    async getReportStats() {
        const total = await this.documentRepository.count();
        
        // Status distribution
        const byStatus = await this.documentRepository
            .createQueryBuilder('document')
            .select('document.status', 'status')
            .addSelect('COUNT(document.id)', 'count')
            .groupBy('document.status')
            .getRawMany();

        // Type distribution
        const byType = await this.documentRepository
            .createQueryBuilder('document')
            .select('document.type', 'type')
            .addSelect('COUNT(document.id)', 'count')
            .groupBy('document.type')
            .getRawMany();

        // Department distribution
        // Since departments is stored as a simple-array (comma-separated string), 
        // we'll fetch all departments and aggregate in memory.
        const allDocs = await this.documentRepository.find({
            select: ['departments'],
        });

        const deptCounts: Record<string, number> = {};
        allDocs.forEach(doc => {
            if (doc.departments) {
                doc.departments.forEach(dept => {
                    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
                });
            }
        });

        const byDepartment = Object.entries(deptCounts).map(([name, value]) => ({
            name,
            value,
        }));

        return {
            total,
            byStatus: byStatus.map(s => ({ name: s.status, value: parseInt(s.count) })),
            byType: byType.map(t => ({ name: t.type, value: parseInt(t.count) })),
            byDepartment,
        };
    }

    async getDepartmentStats() {
        // Fetch all APPROVED documents
        const docs = await this.documentRepository.find({
            where: { status: DocumentStatus.APPROVED }, // Only count approved docs as "Actual"
            select: ['departments', 'type']
        });

        const stats: Record<string, { sops: number, formats: number }> = {};

        docs.forEach(doc => {
             if (doc.departments) {
                 doc.departments.forEach(rawDept => {
                     const dept = rawDept.trim(); // Normalize department name

                     if (!stats[dept]) {
                         stats[dept] = { sops: 0, formats: 0 };
                     }

                     // Categorize
                     // Ensure type comparison is robust
                     const type = doc.type ? doc.type.toLowerCase() : 'other';
                     
                     if (['policy', 'procedure', 'work_instruction', 'sop'].includes(type) || type.includes('sop') || type.includes('instruction')) {
                         stats[dept].sops++;
                     } else if (['form', 'record', 'format'].includes(type) || type.includes('form')) {
                         stats[dept].formats++;
                     }
                 });
             }
        });

        return stats;
    }

    private async logAction(action: AuditAction, userId: string, documentId: string, details: string) {
        const log = this.auditRepository.create({
            action,
            userId,
            documentId,
            details,
        });
        await this.auditRepository.save(log);
    }
}
