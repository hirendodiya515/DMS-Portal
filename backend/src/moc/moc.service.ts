import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { MocRecord } from '../entities/moc-record.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class MocService {
    constructor(
        @InjectRepository(MocRecord)
        private mocRepository: Repository<MocRecord>,
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
        private documentsService: DocumentsService,
    ) {}

    private async logAction(action: AuditAction, userId: string, mocId: string | null, details: string) {
        try {
            const log = this.auditLogRepository.create({
                action,
                userId: userId || undefined,
                mocId: mocId || undefined,
                details,
            } as any);
            await this.auditLogRepository.save(log);
        } catch (error) {
            console.error('Failed to log MOC action:', error);
        }
    }

    async create(data: Partial<MocRecord>, userId?: string) {
        const mocNo = await this.generateMocNumber();
        const moc = this.mocRepository.create({
            ...data,
            mocNo,
            status: data.status || 'Draft',
        });
        const saved = await this.mocRepository.save(moc);

        const isDraft = saved.status === 'Draft';
        const action = isDraft ? AuditAction.CREATE : AuditAction.SUBMIT;
        const details = isDraft ? 'MOC draft initiated' : 'MOC created and submitted for HOD approval';

        await this.logAction(action, userId || saved.requisitionById, saved.id, details);
        return saved;
    }

    async findAll() {
        return this.mocRepository.find({
            relations: ['requisitionBy'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string) {
        return this.mocRepository.findOne({
            where: { id },
            relations: ['requisitionBy'],
        });
    }

    async update(id: string, data: Partial<MocRecord>, userId?: string) {
        const moc = await this.findOne(id);
        if (!moc) {
            throw new Error(`MOC with ID ${id} not found`);
        }

        let action = AuditAction.UPDATE;
        let details = 'MOC draft edited';

        const checkApprovalDiff = (roleName: string, incomingAppr: any, currentAppr: any) => {
            if (incomingAppr && incomingAppr.status && (!currentAppr || currentAppr.status !== incomingAppr.status)) {
                if (incomingAppr.status === 'approved') {
                    action = AuditAction.APPROVE;
                    details = `${roleName} Approved: "${incomingAppr.remarks || 'No remarks'}" (Sign: ${incomingAppr.sign || 'Digital'})`;
                    return true;
                } else if (incomingAppr.status === 'rejected') {
                    action = AuditAction.REJECT;
                    details = `${roleName} Rejected: "${incomingAppr.remarks || 'No remarks'}" (Sign: ${incomingAppr.sign || 'Digital'})`;
                    return true;
                }
            }
            return false;
        };

        let isWorkflowAction = false;
        if (checkApprovalDiff('HOD', data.hodApproval, moc.hodApproval)) isWorkflowAction = true;
        else if (checkApprovalDiff('Plant Head', data.plantHeadApproval, moc.plantHeadApproval)) isWorkflowAction = true;
        else if (checkApprovalDiff('CEO', data.ceoApproval, moc.ceoApproval)) isWorkflowAction = true;
        else if (checkApprovalDiff('EHS', data.ehsApproval, moc.ehsApproval)) isWorkflowAction = true;
        else if (checkApprovalDiff('QA', data.qaApproval, moc.qaApproval)) isWorkflowAction = true;

        if (!isWorkflowAction) {
            if (data.status === 'Pending HOD' && moc.status === 'Draft') {
                action = AuditAction.SUBMIT;
                details = 'MOC submitted for HOD approval';
            } else if (data.status === 'Draft' && moc.status && moc.status !== 'Draft') {
                action = AuditAction.REJECT;
                details = 'MOC rejected and reverted to Draft';
            } else if (moc.status !== 'Draft') {
                action = AuditAction.UPDATE;
                details = 'MOC records updated';
            }
        }

        const { requisitionBy, ...rest } = data as any;
        Object.assign(moc, rest);
        const updated = await this.mocRepository.save(moc);

        await this.logAction(action, userId || rest.requisitionById || moc.requisitionById, updated.id, details);

        if (updated && (updated.status === 'Closed' || updated.status === 'Finalized')) {
            await this.syncToDms(updated);
        }

        return updated;
    }

    async remove(id: string, userId: string) {
        const moc = await this.findOne(id);
        if (!moc) {
            throw new Error(`MOC with ID ${id} not found`);
        }
        await this.logAction(
            AuditAction.DELETE,
            userId,
            null,
            `MOC ${moc.mocNo} - "${moc.productProcess}" deleted`
        );
        await this.mocRepository.remove(moc);
        return { success: true };
    }

    async findLogs() {
        return this.auditLogRepository.createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .leftJoinAndSelect('log.moc', 'moc')
            .where('log.mocId IS NOT NULL OR log.action = :deleteAction', { deleteAction: AuditAction.DELETE })
            .orderBy('log.timestamp', 'DESC')
            .getMany();
    }

    public async generateMocNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const yearPrefix = `${year}-`;
        
        const lastRecord = await this.mocRepository.findOne({
            where: { mocNo: Like(`${yearPrefix}%`) },
            order: { mocNo: 'DESC' },
        });

        let nextNumber = 1;
        if (lastRecord) {
            const lastNoStr = lastRecord.mocNo.split('-')[1];
            nextNumber = parseInt(lastNoStr, 10) + 1;
        }

        const paddedNumber = nextNumber.toString().padStart(3, '0');
        return `${yearPrefix}${paddedNumber}`;
    }

    private async syncToDms(moc: MocRecord) {
        try {
            console.log(`Syncing MOC ${moc.mocNo} to DMS...`);
            
            await this.documentsService.create({
                title: `MOC: ${moc.mocNo} - ${moc.productProcess}`,
                description: moc.description,
                type: 'record',
                departments: [moc.department],
                tags: ['MOC', moc.mocNo],
                status: 'approved', // Automatically approved in DMS if closed in MOC
            }, moc.requisitionById);

            console.log(`Successfully synced MOC ${moc.mocNo} to DMS.`);
        } catch (error) {
            console.error('Failed to sync MOC to DMS:', error);
        }
    }
}
