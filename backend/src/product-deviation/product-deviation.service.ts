import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductDeviation, ProductDeviationStatus } from '../entities/product-deviation.entity';
import { ProductDeviationResponsible } from '../entities/product-deviation-responsible.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { CreateProductDeviationDto, UpdateActionPlanDto, AddMarketingRemarkDto, ApprovePlantHeadDto, ApproveCeoDto, ApproveQualityHeadDto, UpdateDeviationQuantityDto } from './dto/product-deviation.dto';
import { MailService } from '../mail/mail.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ProductDeviationService {
    constructor(
        @InjectRepository(ProductDeviation) private productDeviationRepo: Repository<ProductDeviation>,
        @InjectRepository(ProductDeviationResponsible) private responsibleRepo: Repository<ProductDeviationResponsible>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
        @InjectRepository(SystemSetting) private settingRepo: Repository<SystemSetting>,
        private mailService: MailService,
    ) {}

    private async logAction(action: AuditAction, userId: string, deviationId: string, details?: string) {
        const log = this.auditLogRepo.create({
            action,
            userId,
            productDeviationId: deviationId,
            details,
        });
        await this.auditLogRepo.save(log);
    }

    private async generateSerialNumber(): Promise<string> {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        const lastDeviation = await this.productDeviationRepo.createQueryBuilder('dev')
            .where('dev.serialNumber LIKE :pattern', { pattern: `PD-${year}-${month}-%` })
            .andWhere('dev.isDeleted = :isDeleted', { isDeleted: false })
            .orderBy('dev.serialNumber', 'DESC')
            .getOne();

        let sequence = 1;
        if (lastDeviation) {
            const parts = lastDeviation.serialNumber.split('-');
            sequence = parseInt(parts[3], 10) + 1;
        }

        return `PD-${year}-${month}-${String(sequence).padStart(4, '0')}`;
    }

    private async triggerWorkflowEmail(deviationId: string, submittedByStr?: string) {
        const deviation = await this.productDeviationRepo.findOne({
            where: { id: deviationId },
            relations: ['createdBy', 'responsiblePersons', 'responsiblePersons.user']
        });
        if (!deviation) return;

        const marketingSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_marketing_person' } });
        const plantHeadSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_plant_head' } });
        const qualityHeadSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_quality_head' } });

        const getUser = async (userIdStr: string) => {
            if (!userIdStr) return null;
            return await this.userRepo.findOne({ where: { id: userIdStr } });
        };

        const creatorUser = await getUser(deviation.createdById);
        const marketingUser = await getUser(marketingSetting?.value);
        const plantHeadUser = await getUser(plantHeadSetting?.value);
        const qualityHeadUser = await getUser(qualityHeadSetting?.value);
        
        let toEmails: string[] = [];
        let pendingWith = '';

        if (deviation.status === ProductDeviationStatus.OPEN) {
            const respEmails = deviation.responsiblePersons.map(rp => rp.user?.email).filter(Boolean) as string[];
            const respNames = deviation.responsiblePersons.map(rp => rp.user ? `${rp.user.firstName} ${rp.user.lastName}` : '').filter(Boolean);
            toEmails = [...respEmails, marketingUser?.email, plantHeadUser?.email, qualityHeadUser?.email].filter(Boolean) as string[];
            pendingWith = respNames.length > 0 ? `${respNames.join(', ')} (Responsible Person/s)` : 'Responsible Person(s)';
        } else if (deviation.status === ProductDeviationStatus.PENDING_MARKETING) {
            toEmails = [marketingUser?.email, creatorUser?.email].filter(Boolean) as string[];
            pendingWith = marketingUser ? `${marketingUser.firstName} ${marketingUser.lastName} (Marketing Person)` : 'Marketing Person';
        } else if (deviation.status === ProductDeviationStatus.PENDING_PLANT_HEAD) {
            const ceoSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_ceo' } });
            const ceoUser = await getUser(ceoSetting?.value);
            toEmails = [plantHeadUser?.email, ceoUser?.email, creatorUser?.email].filter(Boolean) as string[];
            const names = [
                plantHeadUser ? `${plantHeadUser.firstName} ${plantHeadUser.lastName} (Plant Head)` : '',
                ceoUser ? `${ceoUser.firstName} ${ceoUser.lastName} (CEO)` : ''
            ].filter(Boolean);
            pendingWith = names.length > 0 ? names.join(' or ') : 'Plant Head or CEO';
        } else if (deviation.status === ProductDeviationStatus.PENDING_QUALITY_HEAD) {
            toEmails = [qualityHeadUser?.email, creatorUser?.email].filter(Boolean) as string[];
            pendingWith = qualityHeadUser ? `${qualityHeadUser.firstName} ${qualityHeadUser.lastName} (Quality Head)` : 'Quality Head';
        } else if (deviation.status === ProductDeviationStatus.CLOSED) {
            toEmails = [creatorUser?.email].filter(Boolean) as string[];
            pendingWith = 'None (Closed)';
        }

        toEmails = [...new Set(toEmails)];
        if (toEmails.length === 0) return;

        const isQuantityUpdated = deviation.updatedTotalQuantityProduced !== null && deviation.updatedTotalQuantityProduced !== undefined;
        const currentTotalQty = isQuantityUpdated ? Number(deviation.updatedTotalQuantityProduced) : Number(deviation.totalQuantityProduced);
        const currentDevQty = isQuantityUpdated && deviation.updatedQuantityUnderDeviation !== null && deviation.updatedQuantityUnderDeviation !== undefined
            ? Number(deviation.updatedQuantityUnderDeviation)
            : Number(deviation.quantityUnderDeviation);
        const currentDevSqm = isQuantityUpdated && deviation.updatedQuantityUnderDeviationPcs !== null && deviation.updatedQuantityUnderDeviationPcs !== undefined
            ? Number(deviation.updatedQuantityUnderDeviationPcs)
            : (deviation.quantityUnderDeviationPcs !== null && deviation.quantityUnderDeviationPcs !== undefined ? Number(deviation.quantityUnderDeviationPcs) : null);

        await this.mailService.sendProductDeviationAlert(toEmails, {
            id: deviation.id,
            serialNumber: deviation.serialNumber,
            status: deviation.status,
            line: deviation.line,
            creationDate: deviation.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            startDate: deviation.startDate ? new Date(deviation.startDate).toLocaleDateString('en-GB') : 'N/A',
            endDate: deviation.endDate ? new Date(deviation.endDate).toLocaleDateString('en-GB') : 'N/A',
            quantityProduced: currentTotalQty,
            quantityUnderDeviation: currentDevQty,
            quantityUnderDeviationSqm: currentDevSqm,
            createdBy: deviation.createdBy ? `${deviation.createdBy.firstName} ${deviation.createdBy.lastName}` : 'Unknown',
            submittedBy: submittedByStr,
            natureOfDeviation: deviation.natureOfDeviation,
            description: deviation.detailsOfDeviation,
            pendingWith,
            isQuantityUpdated,
            initialQuantityProduced: Number(deviation.totalQuantityProduced),
            initialQuantityUnderDeviation: Number(deviation.quantityUnderDeviation),
            initialQuantityUnderDeviationSqm: deviation.quantityUnderDeviationPcs !== null && deviation.quantityUnderDeviationPcs !== undefined ? Number(deviation.quantityUnderDeviationPcs) : null,
        }).catch(err => console.error('Failed to trigger background deviation mail:', err));
    }

    async create(createDto: CreateProductDeviationDto, userId: string) {
        const serialNumber = await this.generateSerialNumber();

        if (createDto.responsiblePersonIds.length > 3) {
            throw new BadRequestException('Maximum 3 responsible persons can be selected.');
        }

        const deviation = this.productDeviationRepo.create({
            serialNumber,
            line: createDto.line,
            startDate: new Date(createDto.startDate),
            endDate: new Date(createDto.endDate),
            totalQuantityProduced: createDto.totalQuantityProduced,
            quantityUnderDeviation: createDto.quantityUnderDeviation,
            quantityUnderDeviationPcs: createDto.quantityUnderDeviationPcs,
            natureOfDeviation: createDto.natureOfDeviation,
            initiatorName: createDto.initiatorName,
            attachments: createDto.attachments,
            detailsOfDeviation: createDto.detailsOfDeviation,
            createdById: userId,
            createdBy: { id: userId } as any,
            status: ProductDeviationStatus.OPEN,
        });

        await this.productDeviationRepo.save(deviation);

        for (const responsibleId of createDto.responsiblePersonIds) {
            const responsible = this.responsibleRepo.create({
                productDeviationId: deviation.id,
                userId: responsibleId,
            });
            await this.responsibleRepo.save(responsible);
        }

        await this.logAction(AuditAction.PRODUCT_DEVIATION_CREATE, userId, deviation.id, 'Created Product Deviation');
        
        // Asynchronously dispatch layout
        this.triggerWorkflowEmail(deviation.id);

        return deviation;
    }

    async findAll() {
        return this.productDeviationRepo.find({
            where: { isDeleted: false },
            relations: ['createdBy', 'responsiblePersons', 'responsiblePersons.user', 'marketingPerson', 'plantHead', 'qualityHead', 'ceo', 'quantityUpdatedBy'],
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string) {
        const deviation = await this.productDeviationRepo.findOne({
            where: { id, isDeleted: false },
            relations: ['createdBy', 'responsiblePersons', 'responsiblePersons.user', 'marketingPerson', 'plantHead', 'qualityHead', 'ceo', 'quantityUpdatedBy', 'auditLogs', 'auditLogs.user'],
        });
        if (!deviation) throw new NotFoundException('Product Deviation not found');
        
        deviation.auditLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return deviation;
    }

    async updateQuantity(id: string, dto: UpdateDeviationQuantityDto, userId: string) {
        const deviation = await this.findOne(id);

        const responsibleRecord = await this.responsibleRepo.findOne({
            where: { productDeviationId: id, userId }
        });

        if (!responsibleRecord) {
            throw new ForbiddenException('Only assigned responsible persons can modify quantities.');
        }

        deviation.updatedTotalQuantityProduced = dto.totalQuantityProduced;
        deviation.updatedQuantityUnderDeviation = dto.quantityUnderDeviation;
        if (dto.quantityUnderDeviationPcs !== undefined) {
            deviation.updatedQuantityUnderDeviationPcs = dto.quantityUnderDeviationPcs;
        }
        deviation.quantityUpdatedById = userId;
        deviation.quantityUpdatedBy = { id: userId } as any;
        deviation.quantityUpdatedAt = new Date();

        // Pass through approval flow: Responsible Person Update -> Plant Head/CEO -> Quality Head -> Closed
        deviation.status = ProductDeviationStatus.PENDING_PLANT_HEAD;

        await this.productDeviationRepo.save(deviation);

        const actor = await this.userRepo.findOne({ where: { id: userId } });
        const actorName = actor ? `${actor.firstName} ${actor.lastName}` : 'Responsible Person';
        
        await this.logAction(
            AuditAction.PRODUCT_DEVIATION_UPDATE,
            userId,
            id,
            `Responsible person (${actorName}) updated quantities: Total=${dto.totalQuantityProduced} pcs, DevPcs=${dto.quantityUnderDeviationPcs} pcs, DevSqm=${dto.quantityUnderDeviation ?? 'N/A'}`
        );

        this.triggerWorkflowEmail(deviation.id, `${actorName} (Quantity Updated)`);

        return deviation;
    }


    async getSummary() {
        const total = await this.productDeviationRepo.count({ where: { isDeleted: false } });
        const open = await this.productDeviationRepo.count({
            where: [
                { status: ProductDeviationStatus.OPEN, isDeleted: false },
                { status: ProductDeviationStatus.PENDING_MARKETING, isDeleted: false },
                { status: ProductDeviationStatus.PENDING_PLANT_HEAD, isDeleted: false },
                { status: ProductDeviationStatus.PENDING_QUALITY_HEAD, isDeleted: false }
            ]
        });

        const rawMonthWise = await this.productDeviationRepo.query(`
            SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*) as count 
            FROM product_deviations 
            WHERE "isDeleted" = false
            GROUP BY TO_CHAR("createdAt", 'YYYY-MM') 
            ORDER BY month DESC LIMIT 12
        `);

        const rawDeviationMonthWise = await this.productDeviationRepo.query(`
            SELECT COALESCE(TO_CHAR("startDate", 'YYYY-MM'), 'Unspecified Date') as month, COUNT(*) as count 
            FROM product_deviations 
            WHERE "isDeleted" = false
            GROUP BY TO_CHAR("startDate", 'YYYY-MM') 
            ORDER BY month DESC LIMIT 12
        `);

        return {
            totalDeviations: total,
            openDeviations: open,
            closedDeviations: total - open,
            monthWise: rawMonthWise.map((r: any) => ({ month: r.month, count: Number(r.count) })),
            deviationMonthWise: rawDeviationMonthWise.map((r: any) => ({ month: r.month, count: Number(r.count) }))
        };
    }

    async updateActionPlan(id: string, dto: UpdateActionPlanDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProductDeviationStatus.OPEN) {
            throw new BadRequestException('Action plans can only be added when status is OPEN.');
        }

        const responsibleRecord = await this.responsibleRepo.findOne({
            where: { productDeviationId: id, userId }
        });

        if (!responsibleRecord) {
            throw new ForbiddenException('Only assigned responsible persons can add action plans.');
        }

        if (dto.containmentAction !== undefined) deviation.containmentAction = dto.containmentAction;
        if (dto.correctiveAction !== undefined) deviation.correctiveAction = dto.correctiveAction;
        if (dto.rootCauseAnalysis !== undefined) deviation.rootCauseAnalysis = dto.rootCauseAnalysis;
        if (dto.disposalAction !== undefined) deviation.disposalAction = dto.disposalAction;

        if (dto.attachments && dto.attachments.length > 0) {
            deviation.actionPlanAttachments = [
                ...(deviation.actionPlanAttachments || []),
                ...dto.attachments
            ];
        }

        responsibleRecord.signedAt = new Date();
        await this.responsibleRepo.save(responsibleRecord);

        // Update the cached record in the parent deviation so cascade save doesn't erase it
        const memRecord = deviation.responsiblePersons.find(rp => rp.userId === userId);
        if (memRecord) {
            memRecord.signedAt = responsibleRecord.signedAt;
        }

        // Check if ANY responsible persons have signed to advance the workflow
        const anySigned = deviation.responsiblePersons.some(r => r.signedAt != null);

        if (anySigned) {
            const enableMarketingSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_enable_marketing' } });
            const val = enableMarketingSetting?.value;
            const enableMarketing = val !== false && val !== 'false' && val !== '0' && val !== 0;
            deviation.status = enableMarketing ? ProductDeviationStatus.PENDING_MARKETING : ProductDeviationStatus.PENDING_PLANT_HEAD;
        }

        await this.productDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PRODUCT_DEVIATION_SIGN, userId, id, 'Responsible person signed action plan.');
        
        // Progress hook dispatcher
        if (deviation.status === ProductDeviationStatus.PENDING_MARKETING || deviation.status === ProductDeviationStatus.PENDING_PLANT_HEAD) {
            const actor = await this.userRepo.findOne({where: {id: userId}});
            this.triggerWorkflowEmail(deviation.id, actor ? `${actor.firstName} ${actor.lastName}` : 'Responsible Person');
        }

        return deviation;
    }

    async addMarketingRemark(id: string, dto: AddMarketingRemarkDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProductDeviationStatus.PENDING_MARKETING) {
            throw new BadRequestException('Not waiting for Marketing Person.');
        }

        const user = await this.userRepo.findOne({ where: { id: userId } });
        const marketingSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_marketing_person' } });
        
        if (marketingSetting?.value) {
            if (marketingSetting.value !== userId) {
                throw new ForbiddenException('Only the uniquely designated Default Marketing Person can log remarks.');
            }
        } else if (user?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('No default marketing person is set. Only Admins can override this log.');
        }

        deviation.marketingRemarks = dto.marketingRemarks;
        deviation.marketingPersonId = userId;
        deviation.marketingPerson = { id: userId } as any;
        deviation.marketingSignedAt = new Date();
        deviation.marketingAttachments = dto.attachments || [];
        deviation.status = ProductDeviationStatus.PENDING_PLANT_HEAD;

        await this.productDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PRODUCT_DEVIATION_SIGN, userId, id, 'Marketing person signed remark.');

        const actor = await this.userRepo.findOne({where: {id: userId}});
        this.triggerWorkflowEmail(deviation.id, actor ? `${actor.firstName} ${actor.lastName}` : 'Marketing Person');

        return deviation;
    }

    async approvePlantHead(id: string, dto: ApprovePlantHeadDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProductDeviationStatus.PENDING_PLANT_HEAD) {
            throw new BadRequestException('Not waiting for Plant Head.');
        }

        const user = await this.userRepo.findOne({ where: { id: userId } });
        const plantHeadSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_plant_head' } });
        
        if (plantHeadSetting?.value) {
            if (plantHeadSetting.value !== userId) {
                throw new ForbiddenException('Only the uniquely designated Default Plant Head can approve this deviation.');
            }
        } else if (user?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('No default plant head is set. Only Admins can override this approval.');
        }

        deviation.plantHeadRemarks = dto.plantHeadRemarks || '';
        deviation.plantHeadId = userId;
        deviation.plantHead = { id: userId } as any;
        deviation.plantHeadSignedAt = new Date();
        deviation.plantHeadAttachments = dto.attachments || [];
        deviation.status = ProductDeviationStatus.PENDING_QUALITY_HEAD;

        await this.productDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PRODUCT_DEVIATION_SIGN, userId, id, 'Plant Head forwarded deviation to Quality.');

        const actor = await this.userRepo.findOne({where: {id: userId}});
        this.triggerWorkflowEmail(deviation.id, actor ? `${actor.firstName} ${actor.lastName}` : 'Plant Head');

        return deviation;
    }

    async approveCeo(id: string, dto: ApproveCeoDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProductDeviationStatus.PENDING_PLANT_HEAD) {
            throw new BadRequestException('Not waiting for CEO/Plant Head approval.');
        }

        const user = await this.userRepo.findOne({ where: { id: userId } });
        const ceoSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_ceo' } });
        
        if (ceoSetting?.value) {
            if (ceoSetting.value !== userId) {
                throw new ForbiddenException('Only the uniquely designated Default CEO can approve this deviation.');
            }
        } else if (user?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('No default CEO is set. Only Admins can override this approval.');
        }

        deviation.ceoRemarks = dto.ceoRemarks || '';
        deviation.ceoId = userId;
        deviation.ceo = { id: userId } as any;
        deviation.ceoSignedAt = new Date();
        deviation.ceoAttachments = dto.attachments || [];
        deviation.status = ProductDeviationStatus.PENDING_QUALITY_HEAD;

        await this.productDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PRODUCT_DEVIATION_SIGN, userId, id, 'CEO approved and forwarded deviation to Quality.');

        const actor = await this.userRepo.findOne({where: {id: userId}});
        this.triggerWorkflowEmail(deviation.id, actor ? `${actor.firstName} ${actor.lastName}` : 'CEO');

        return deviation;
    }

    async approveQualityHead(id: string, dto: ApproveQualityHeadDto, userId: string) {
        const deviation = await this.findOne(id);
        if (deviation.status !== ProductDeviationStatus.PENDING_QUALITY_HEAD) {
            throw new BadRequestException('Not waiting for Quality Head.');
        }

        const user = await this.userRepo.findOne({ where: { id: userId } });
        const qualityHeadSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_quality_head' } });
        
        if (qualityHeadSetting?.value) {
            if (qualityHeadSetting.value !== userId) {
                throw new ForbiddenException('Only the uniquely designated Default Quality Head can close this deviation.');
            }
        } else if (user?.role !== UserRole.ADMIN) {
            throw new ForbiddenException('No default quality head is set. Only Admins can override this closure.');
        }

        deviation.qualityHeadRemarks = dto.qualityHeadRemarks || '';
        deviation.qualityHeadId = userId;
        deviation.qualityHead = { id: userId } as any;
        deviation.qualityHeadSignedAt = new Date();
        deviation.qualityHeadAttachments = dto.attachments || [];
        deviation.status = ProductDeviationStatus.CLOSED;

        await this.productDeviationRepo.save(deviation);
        await this.logAction(AuditAction.PRODUCT_DEVIATION_SIGN, userId, id, 'Quality Head approved and closed deviation.');

        const actor = await this.userRepo.findOne({where: {id: userId}});
        this.triggerWorkflowEmail(deviation.id, actor ? `${actor.firstName} ${actor.lastName}` : 'Quality Head');

        return deviation;
    }

    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async checkPendingDeviations() {
        const mailAlertDaysSetting = await this.settingRepo.findOne({ where: { key: 'product_deviation_mail_alert_days' } });
        const alertDays = mailAlertDaysSetting?.value ? parseInt(mailAlertDaysSetting.value, 10) : 0;
        
        if (alertDays <= 0) return;

        const openDeviations = await this.productDeviationRepo.find({
            where: [
                { status: ProductDeviationStatus.OPEN, isDeleted: false },
                { status: ProductDeviationStatus.PENDING_MARKETING, isDeleted: false },
                { status: ProductDeviationStatus.PENDING_PLANT_HEAD, isDeleted: false },
                { status: ProductDeviationStatus.PENDING_QUALITY_HEAD, isDeleted: false }
            ]
        });

        const today = new Date();
        for (const dev of openDeviations) {
            const diffTime = Math.abs(today.getTime() - dev.updatedAt.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0 && diffDays % alertDays === 0) {
                await this.triggerWorkflowEmail(dev.id);
            }
        }
    }

    async delete(id: string, userId: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admin users can delete deviations.');
        }

        const deviation = await this.productDeviationRepo.findOne({ where: { id } });
        if (!deviation) throw new NotFoundException('Product Deviation not found');

        deviation.isDeleted = true;
        await this.productDeviationRepo.save(deviation);

        await this.logAction(AuditAction.DELETE, userId, id, 'Soft-deleted Product Deviation');
        return { success: true };
    }
}
