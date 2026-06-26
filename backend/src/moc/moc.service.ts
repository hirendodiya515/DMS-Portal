import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { MocRecord } from '../entities/moc-record.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { DocumentsService } from '../documents/documents.service';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MocService {
    constructor(
        @InjectRepository(MocRecord)
        private mocRepository: Repository<MocRecord>,
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private documentsService: DocumentsService,
        private mailService: MailService,
        private settingsService: SettingsService,
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

        this.triggerMocEmailAlerts(saved, null, userId || saved.requisitionById, action).catch(err =>
            console.error('Failed to trigger email alerts for MOC create:', err)
        );

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
        else if (checkApprovalDiff('QC Head', data.qcHeadApproval, moc.qcHeadApproval)) isWorkflowAction = true;
        else if (checkApprovalDiff('Plant Head', data.plantHeadApproval, moc.plantHeadApproval)) isWorkflowAction = true;
        else if (checkApprovalDiff('CEO', data.ceoApproval, moc.ceoApproval)) isWorkflowAction = true;
        else if (checkApprovalDiff('EHS', data.ehsApproval, moc.ehsApproval)) isWorkflowAction = true;
        else if (checkApprovalDiff('QA', data.qaApproval, moc.qaApproval)) isWorkflowAction = true;

        if (!isWorkflowAction) {
            if (data.status && data.status.startsWith('Pending ') && moc.status === 'Draft') {
                action = AuditAction.SUBMIT;
                details = `MOC submitted for ${data.status.replace('Pending ', '')} approval`;
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

        // Trigger dynamic email alert asynchronously
        this.triggerMocEmailAlerts(updated, moc, userId || rest.requisitionById || moc.requisitionById, action).catch(err =>
            console.error('Failed to trigger email alerts for MOC update:', err)
        );

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

    private async getEmailsForRole(roleKey: string, hodName?: string): Promise<string[]> {
        if (roleKey === 'hod') {
            if (!hodName) return [];
            const users = await this.userRepository.find();
            const matched = users.filter(u => 
                `${u.firstName} ${u.lastName}`.trim().toLowerCase() === hodName.trim().toLowerCase()
            );
            return matched.map(u => u.email).filter(Boolean);
        }

        try {
            const settings = await this.settingsService.getSetting('moc_approval_settings');
            const customEmails = settings?.approvers?.[roleKey] || settings?.[roleKey] || [];
            if (customEmails.length > 0) {
                return customEmails;
            }
        } catch (e) {
            console.error('Failed to read MOC settings:', e);
        }

        let fallbackRoles: string[] = [];
        if (roleKey === 'qc_head' || roleKey === 'plant_head') {
            fallbackRoles = ['dept_head', 'reviewer', 'admin'];
        } else if (roleKey === 'ceo') {
            fallbackRoles = ['reviewer', 'admin'];
        } else if (roleKey === 'ehs' || roleKey === 'qa') {
            fallbackRoles = ['compliance_manager', 'reviewer', 'admin'];
        }

        if (fallbackRoles.length > 0) {
            const users = await this.userRepository.find();
            const matched = users.filter(u => fallbackRoles.includes(u.role) && u.isActive);
            return matched.map(u => u.email).filter(Boolean);
        }

        return [];
    }

    private async triggerMocEmailAlerts(updated: MocRecord, oldMoc: MocRecord | null, actorId: string, action: AuditAction) {
        try {
            const creator = await this.userRepository.findOne({ where: { id: updated.requisitionById } });
            const creatorEmail = creator?.email;
            const actionUrl = `http://localhost:5173/edit-moc/${updated.id}`;

            const actor = await this.userRepository.findOne({ where: { id: actorId } });
            const actorName = actor ? `${actor.firstName} ${actor.lastName}` : 'System';

            // 1. Rejection notification
            if (updated.status === 'Draft' && oldMoc && oldMoc.status !== 'Draft' && action === AuditAction.REJECT) {
                let remarks = 'No remarks';
                const approvalFields = [
                    { name: 'HOD', val: updated.hodApproval },
                    { name: 'QC Head', val: updated.qcHeadApproval },
                    { name: 'Plant Head', val: updated.plantHeadApproval },
                    { name: 'CEO', val: updated.ceoApproval },
                    { name: 'EHS', val: updated.ehsApproval },
                    { name: 'QA', val: updated.qaApproval }
                ];
                const rejectedStep = approvalFields.find(f => f.val?.status === 'rejected');
                if (rejectedStep) {
                    remarks = rejectedStep.val.remarks || remarks;
                }

                if (creatorEmail) {
                    await this.mailService.sendMocAlert([creatorEmail], {
                        id: updated.id,
                        mocNo: updated.mocNo,
                        status: updated.status,
                        department: updated.department,
                        productProcess: updated.productProcess,
                        requisitionByName: updated.requisitionByName || 'N/A',
                        description: updated.description,
                        pendingWith: 'Creator (Draft)',
                        actionUrl,
                        decisionType: 'rejected',
                        remarks,
                        actorName
                    });
                }
                return;
            }

            // 2. Finalized notification
            if (updated.status === 'Finalized' || updated.status === 'Closed') {
                if (creatorEmail) {
                    await this.mailService.sendMocAlert([creatorEmail], {
                        id: updated.id,
                        mocNo: updated.mocNo,
                        status: updated.status,
                        department: updated.department,
                        productProcess: updated.productProcess,
                        requisitionByName: updated.requisitionByName || 'N/A',
                        description: updated.description,
                        pendingWith: 'None (Finalized)',
                        actionUrl,
                        decisionType: 'finalized',
                        actorName
                    });
                }
                return;
            }

            // 3. Pending Approvals
            if (updated.status && updated.status.startsWith('Pending ')) {
                const pendingRoleStr = updated.status.replace('Pending ', '');
                
                let roleKey = '';
                if (pendingRoleStr === 'HOD') roleKey = 'hod';
                else if (pendingRoleStr === 'QC Head') roleKey = 'qc_head';
                else if (pendingRoleStr === 'Plant Head') roleKey = 'plant_head';
                else if (pendingRoleStr === 'CEO') roleKey = 'ceo';
                else if (pendingRoleStr === 'EHS') roleKey = 'ehs';
                else if (pendingRoleStr === 'QA') roleKey = 'qa';

                if (roleKey) {
                    const recipientEmails = await this.getEmailsForRole(roleKey, updated.hodName);
                    if (recipientEmails.length > 0) {
                        const isSubmit = !oldMoc || oldMoc.status === 'Draft';
                        await this.mailService.sendMocAlert(recipientEmails, {
                            id: updated.id,
                            mocNo: updated.mocNo,
                            status: updated.status,
                            department: updated.department,
                            productProcess: updated.productProcess,
                            requisitionByName: updated.requisitionByName || 'N/A',
                            description: updated.description,
                            pendingWith: pendingRoleStr,
                            actionUrl,
                            decisionType: isSubmit ? 'submitted' : 'approved',
                            actorName: isSubmit ? undefined : actorName
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Failed to process MOC email workflow:', e);
        }
    }
}
