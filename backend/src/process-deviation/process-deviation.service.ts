import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessDeviation, ProcessDeviationStatus } from '../entities/process-deviation.entity';
import { ProcessDeviationResponsible } from '../entities/process-deviation-responsible.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { CreateProcessDeviationDto, UpdateActionPlanDto, ApproveStepDto } from './dto/process-deviation.dto';
import { MailService } from '../mail/mail.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ProcessDeviationService {
    constructor(
        @InjectRepository(ProcessDeviation) private processDeviationRepo: Repository<ProcessDeviation>,
        @InjectRepository(ProcessDeviationResponsible) private responsibleRepo: Repository<ProcessDeviationResponsible>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
        @InjectRepository(SystemSetting) private settingRepo: Repository<SystemSetting>,
        private mailService: MailService,
    ) {}

    private async logAction(action: AuditAction, userId: string, deviationId: string, details?: string) {
        const log = this.auditLogRepo.create({
            action,
            userId,
            processDeviationId: deviationId,
            details,
        });
        await this.auditLogRepo.save(log);
    }

    private async generateSerialNumber(): Promise<string> {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        const lastDeviation = await this.processDeviationRepo.createQueryBuilder('dev')
            .where('dev.serialNumber LIKE :pattern', { pattern: `PRD-${year}-${month}-%` })
            .orderBy('dev.serialNumber', 'DESC')
            .getOne();

        let sequence = 1;
        if (lastDeviation) {
            const parts = lastDeviation.serialNumber.split('-');
            sequence = parseInt(parts[3], 10) + 1;
        }

        return `PRD-${year}-${month}-${String(sequence).padStart(4, '0')}`;
    }

    private async triggerWorkflowEmail(deviationId: string, submittedByStr?: string) {
        const deviation = await this.processDeviationRepo.findOne({
            where: { id: deviationId },
            relations: ['createdBy', 'responsiblePersons', 'responsiblePersons.user']
        });
        if (!deviation) return;

        // Settings for QA, Plant, Process Heads and CEO
        const qaHeadSetting = await this.settingRepo.findOne({ where: { key: 'process_deviation_qa_head' } });
        const plantHeadSetting = await this.settingRepo.findOne({ where: { key: 'process_deviation_plant_head' } });
        const processHeadSetting = await this.settingRepo.findOne({ where: { key: 'process_deviation_process_head' } });
        const ceoSetting = await this.settingRepo.findOne({ where: { key: 'process_deviation_ceo' } });

        const getUser = async (id: string) => id ? await this.userRepo.findOne({ where: { id } }) : null;

        // Functional Head is dynamic based on department
        const functionalHead = await this.userRepo.findOne({
            where: { department: deviation.department, role: UserRole.DEPT_HEAD }
        });

        const creatorUser = await getUser(deviation.createdById);
        const qaHeadUser = await getUser(qaHeadSetting?.value);
        const plantHeadUser = await getUser(plantHeadSetting?.value);
        const processHeadUser = await getUser(processHeadSetting?.value);
        const ceoUser = await getUser(ceoSetting?.value);
        
        let toEmails: string[] = [];
        let pendingWith = '';

        if (deviation.status === ProcessDeviationStatus.OPEN) {
            const respEmails = deviation.responsiblePersons.map(rp => rp.user?.email).filter(Boolean) as string[];
            const respNames = deviation.responsiblePersons.map(rp => rp.user ? `${rp.user.firstName} ${rp.user.lastName}` : '').filter(Boolean);
            toEmails = [...respEmails, functionalHead?.email, qaHeadUser?.email, plantHeadUser?.email, processHeadUser?.email, ceoUser?.email].filter(Boolean) as string[];
            pendingWith = respNames.length > 0 ? `${respNames.join(', ')} (Responsible Person/s)` : 'Responsible Person(s)';
        } else if (deviation.status === ProcessDeviationStatus.PENDING_FUNCTIONAL_HEAD) {
            toEmails = [functionalHead?.email, creatorUser?.email].filter(Boolean) as string[];
            pendingWith = functionalHead ? `${functionalHead.firstName} ${functionalHead.lastName} (Functional Head)` : 'Functional Head';
        } else if (deviation.status === ProcessDeviationStatus.PENDING_QA_HEAD) {
            toEmails = [qaHeadUser?.email, creatorUser?.email].filter(Boolean) as string[];
            pendingWith = qaHeadUser ? `${qaHeadUser.firstName} ${qaHeadUser.lastName} (QA Head)` : 'QA Head';
        } else if (deviation.status === ProcessDeviationStatus.PENDING_PLANT_HEAD) {
            toEmails = [plantHeadUser?.email, creatorUser?.email].filter(Boolean) as string[];
            pendingWith = plantHeadUser ? `${plantHeadUser.firstName} ${plantHeadUser.lastName} (Plant Head)` : 'Plant Head';
        } else if (deviation.status === ProcessDeviationStatus.PENDING_PROCESS_HEAD) {
            toEmails = [processHeadUser?.email, creatorUser?.email].filter(Boolean) as string[];
            pendingWith = processHeadUser ? `${processHeadUser.firstName} ${processHeadUser.lastName} (Process Head)` : 'Process Head';
        } else if (deviation.status === ProcessDeviationStatus.PENDING_CEO) {
            toEmails = [ceoUser?.email, creatorUser?.email].filter(Boolean) as string[];
            pendingWith = ceoUser ? `${ceoUser.firstName} ${ceoUser.lastName} (CEO)` : 'CEO';
        } else if (deviation.status === ProcessDeviationStatus.CLOSED) {
            toEmails = [creatorUser?.email].filter(Boolean) as string[];
            pendingWith = 'None (Closed)';
        }

        toEmails = [...new Set(toEmails)];
        if (toEmails.length === 0) return;

        await this.mailService.sendProcessDeviationAlert(toEmails, {
            id: deviation.id,
            serialNumber: deviation.serialNumber,
            status: deviation.status,
            line: deviation.line,
            creationDate: deviation.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            startDate: deviation.startDate ? new Date(deviation.startDate).toLocaleDateString('en-GB') : 'N/A',
            endDate: deviation.endDate ? new Date(deviation.endDate).toLocaleDateString('en-GB') : 'N/A',
            parameterUnderDeviation: deviation.parameterUnderDeviation,
            specificationOfParameter: deviation.parameterSpecification,
            createdBy: deviation.createdBy ? `${deviation.createdBy.firstName} ${deviation.createdBy.lastName}` : 'Unknown',
            submittedBy: submittedByStr,
            natureOfDeviation: deviation.natureOfDeviation,
            description: deviation.detailsOfDeviation,
            pendingWith
        }).catch(err => console.error('Failed to trigger background process deviation mail:', err));
    }

    async create(createDto: CreateProcessDeviationDto, userId: string) {
        const serialNumber = await this.generateSerialNumber();

        if (createDto.responsiblePersonIds.length > 3) {
            throw new BadRequestException('Maximum 3 responsible persons can be selected.');
        }

        const deviation = this.processDeviationRepo.create({
            serialNumber,
            line: createDto.line,
            startDate: new Date(createDto.startDate),
            endDate: new Date(createDto.endDate),
            parameterUnderDeviation: createDto.parameterUnderDeviation,
            parameterSpecification: createDto.parameterSpecification,
            natureOfDeviation: createDto.natureOfDeviation,
            detailsOfDeviation: createDto.detailsOfDeviation,
            department: createDto.department,
            createdById: userId,
            createdBy: { id: userId } as any,
            status: ProcessDeviationStatus.OPEN,
        });

        await this.processDeviationRepo.save(deviation);

        for (const responsibleId of createDto.responsiblePersonIds) {
            const responsible = this.responsibleRepo.create({
                processDeviationId: deviation.id,
                userId: responsibleId,
            });
            await this.responsibleRepo.save(responsible);
        }

        await this.logAction(AuditAction.PROCESS_DEVIATION_CREATE, userId, deviation.id, 'Created Process Deviation');
        this.triggerWorkflowEmail(deviation.id);

        return deviation;
    }

    async findAll() {
        return this.processDeviationRepo.find({
            relations: ['createdBy', 'responsiblePersons', 'responsiblePersons.user', 'functionalHead', 'qaHead', 'plantHead', 'processHead', 'ceo'],
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string) {
        const deviation = await this.processDeviationRepo.findOne({
            where: { id },
            relations: ['createdBy', 'responsiblePersons', 'responsiblePersons.user', 'functionalHead', 'qaHead', 'plantHead', 'processHead', 'ceo', 'auditLogs', 'auditLogs.user'],
        });
        if (!deviation) throw new NotFoundException('Process Deviation not found');
        
        deviation.auditLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return deviation;
    }

    async updateActionPlan(id: string, dto: UpdateActionPlanDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProcessDeviationStatus.OPEN) {
            throw new BadRequestException('Action plans can only be added when status is OPEN.');
        }

        const responsibleRecord = await this.responsibleRepo.findOne({
            where: { processDeviationId: id, userId }
        });

        if (!responsibleRecord) {
            throw new ForbiddenException('Only assigned responsible persons can add action plans.');
        }

        if (dto.containmentAction !== undefined) deviation.containmentAction = dto.containmentAction;
        if (dto.correctiveAction !== undefined) deviation.correctiveAction = dto.correctiveAction;
        if (dto.rootCauseAnalysis !== undefined) deviation.rootCauseAnalysis = dto.rootCauseAnalysis;

        responsibleRecord.signedAt = new Date();
        await this.responsibleRepo.save(responsibleRecord);

        const memRecord = deviation.responsiblePersons.find(rp => rp.userId === userId);
        if (memRecord) memRecord.signedAt = responsibleRecord.signedAt;

        const anySigned = deviation.responsiblePersons.some(r => r.signedAt != null);

        if (anySigned) {
            deviation.status = ProcessDeviationStatus.PENDING_FUNCTIONAL_HEAD;
        }

        await this.processDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PROCESS_DEVIATION_SIGN, userId, id, 'Responsible person signed action plan.');
        
        if (deviation.status === ProcessDeviationStatus.PENDING_FUNCTIONAL_HEAD) {
            const actor = await this.userRepo.findOne({where: {id: userId}});
            this.triggerWorkflowEmail(deviation.id, actor ? `${actor.firstName} ${actor.lastName}` : 'Responsible Person');
        }

        return deviation;
    }

    // Step 1: Functional Head
    async approveFunctionalHead(id: string, dto: ApproveStepDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProcessDeviationStatus.PENDING_FUNCTIONAL_HEAD) {
            throw new BadRequestException('Not waiting for Functional Head.');
        }

        const functionalHead = await this.userRepo.findOne({
            where: { department: deviation.department, role: UserRole.DEPT_HEAD }
        });

        if (functionalHead?.id !== userId) {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (user?.role !== UserRole.ADMIN) {
                throw new ForbiddenException('Only the Department Head can approve this step.');
            }
        }

        deviation.functionalHeadRemarks = dto.remarks || '';
        deviation.functionalHeadId = userId;
        deviation.functionalHeadSignedAt = new Date();
        deviation.status = ProcessDeviationStatus.PENDING_QA_HEAD;

        await this.processDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PROCESS_DEVIATION_SIGN, userId, id, 'Functional Head signed.');
        this.triggerWorkflowEmail(deviation.id);
        return deviation;
    }

    // Step 2: QA Head
    async approveQAHead(id: string, dto: ApproveStepDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProcessDeviationStatus.PENDING_QA_HEAD) {
            throw new BadRequestException('Not waiting for QA Head.');
        }

        const setting = await this.settingRepo.findOne({ where: { key: 'process_deviation_qa_head' } });
        if (setting?.value && setting.value !== userId) {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (user?.role !== UserRole.ADMIN) throw new ForbiddenException('Only designated QA Head can approve.');
        }

        deviation.qaHeadRemarks = dto.remarks || '';
        deviation.qaHeadId = userId;
        deviation.qaHeadSignedAt = new Date();
        deviation.status = ProcessDeviationStatus.PENDING_PLANT_HEAD;

        await this.processDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PROCESS_DEVIATION_SIGN, userId, id, 'QA Head signed.');
        this.triggerWorkflowEmail(deviation.id);
        return deviation;
    }

    // Step 3: Plant Head
    async approvePlantHead(id: string, dto: ApproveStepDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProcessDeviationStatus.PENDING_PLANT_HEAD) {
            throw new BadRequestException('Not waiting for Plant Head.');
        }

        const setting = await this.settingRepo.findOne({ where: { key: 'process_deviation_plant_head' } });
        if (setting?.value && setting.value !== userId) {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (user?.role !== UserRole.ADMIN) throw new ForbiddenException('Only designated Plant Head can approve.');
        }

        deviation.plantHeadRemarks = dto.remarks || '';
        deviation.plantHeadId = userId;
        deviation.plantHeadSignedAt = new Date();
        deviation.status = ProcessDeviationStatus.PENDING_PROCESS_HEAD;

        await this.processDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PROCESS_DEVIATION_SIGN, userId, id, 'Plant Head signed.');
        this.triggerWorkflowEmail(deviation.id);
        return deviation;
    }

    // Step 4: Process Head
    async approveProcessHead(id: string, dto: ApproveStepDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProcessDeviationStatus.PENDING_PROCESS_HEAD) {
            throw new BadRequestException('Not waiting for Process Head.');
        }

        const setting = await this.settingRepo.findOne({ where: { key: 'process_deviation_process_head' } });
        if (setting?.value && setting.value !== userId) {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (user?.role !== UserRole.ADMIN) throw new ForbiddenException('Only designated Process Head can approve.');
        }

        deviation.processHeadRemarks = dto.remarks || '';
        deviation.processHeadId = userId;
        deviation.processHeadSignedAt = new Date();
        deviation.status = ProcessDeviationStatus.PENDING_CEO;

        await this.processDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PROCESS_DEVIATION_SIGN, userId, id, 'Process Head signed.');
        this.triggerWorkflowEmail(deviation.id);
        return deviation;
    }

    // Step 5: CEO
    async approveCEO(id: string, dto: ApproveStepDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProcessDeviationStatus.PENDING_CEO) {
            throw new BadRequestException('Not waiting for CEO.');
        }

        const setting = await this.settingRepo.findOne({ where: { key: 'process_deviation_ceo' } });
        if (setting?.value && setting.value !== userId) {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (user?.role !== UserRole.ADMIN) throw new ForbiddenException('Only designated CEO can approve.');
        }

        deviation.ceoRemarks = dto.remarks || '';
        deviation.ceoId = userId;
        deviation.ceoSignedAt = new Date();
        deviation.status = ProcessDeviationStatus.CLOSED;

        await this.processDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PROCESS_DEVIATION_SIGN, userId, id, 'CEO approved and closed deviation.');
        this.triggerWorkflowEmail(deviation.id);
        return deviation;
    }

    async getSummary() {
        const total = await this.processDeviationRepo.count();
        const open = await this.processDeviationRepo.count({
            where: [
                { status: ProcessDeviationStatus.OPEN },
                { status: ProcessDeviationStatus.PENDING_FUNCTIONAL_HEAD },
                { status: ProcessDeviationStatus.PENDING_QA_HEAD },
                { status: ProcessDeviationStatus.PENDING_PLANT_HEAD },
                { status: ProcessDeviationStatus.PENDING_PROCESS_HEAD },
                { status: ProcessDeviationStatus.PENDING_CEO }
            ]
        });

        const rawMonthWise = await this.processDeviationRepo.query(`
            SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*) as count 
            FROM process_deviations 
            GROUP BY TO_CHAR("createdAt", 'YYYY-MM') 
            ORDER BY month DESC LIMIT 12
        `);

        return {
            totalDeviations: total,
            openDeviations: open,
            closedDeviations: total - open,
            monthWise: rawMonthWise.map((r: any) => ({ month: r.month, count: Number(r.count) })),
        };
    }
}
