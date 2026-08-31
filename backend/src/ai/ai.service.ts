import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, Like, LessThan, Between } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeBaseService } from './knowledge-base.service';
import { Document } from '../entities/document.entity';
import { Equipment } from '../entities/equipment.entity';
import { AuditPlan } from '../entities/audit-plan.entity';
import { AuditSchedule } from '../entities/audit-schedule.entity';
import { Risk } from '../entities/risk.entity';
import { OrgNode } from '../entities/org-node.entity';
import { Objective } from '../entities/objective.entity';
import { SwotIssue } from '../entities/swot-issue.entity';
import { ProductDeviation } from '../entities/product-deviation.entity';
import { ProcessDeviation } from '../entities/process-deviation.entity';
import { MocRecord } from '../entities/moc-record.entity';
import { AuditParticipant } from '../entities/audit-participant.entity';
import { HiraRisk } from '../entities/hira-risk.entity';
import { EaaRisk } from '../entities/eaa-risk.entity';
import { QraRisk } from '../entities/qra-risk.entity';
import { InterestedParty } from '../entities/interested-party.entity';
import { SystemSetting } from '../entities/system-setting.entity';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly ollamaUrl: string;
    private readonly modelName: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly kbService: KnowledgeBaseService,
        @InjectRepository(Document)
        private readonly docRepo: Repository<Document>,
        @InjectRepository(Equipment)
        private readonly eqRepo: Repository<Equipment>,
        @InjectRepository(AuditPlan)
        private readonly planRepo: Repository<AuditPlan>,
        @InjectRepository(AuditSchedule)
        private readonly schedRepo: Repository<AuditSchedule>,
        @InjectRepository(Risk)
        private readonly riskRepo: Repository<Risk>,
        @InjectRepository(OrgNode)
        private readonly orgRepo: Repository<OrgNode>,
        @InjectRepository(Objective)
        private readonly objRepo: Repository<Objective>,
        @InjectRepository(SwotIssue)
        private readonly swotRepo: Repository<SwotIssue>,
        @InjectRepository(ProductDeviation)
        private readonly prodDevRepo: Repository<ProductDeviation>,
        @InjectRepository(ProcessDeviation)
        private readonly procDevRepo: Repository<ProcessDeviation>,
        @InjectRepository(MocRecord)
        private readonly mocRepo: Repository<MocRecord>,
        @InjectRepository(AuditParticipant)
        private readonly participantRepo: Repository<AuditParticipant>,
        @InjectRepository(HiraRisk)
        private readonly hiraRepo: Repository<HiraRisk>,
        @InjectRepository(EaaRisk)
        private readonly eaaRepo: Repository<EaaRisk>,
        @InjectRepository(QraRisk)
        private readonly qraRepo: Repository<QraRisk>,
        @InjectRepository(InterestedParty)
        private readonly interestedRepo: Repository<InterestedParty>,
        @InjectRepository(SystemSetting)
        private readonly settingsRepo: Repository<SystemSetting>,
    ) {
        this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
        // Default to gemma4:e4b which is the lightweight 4B variant optimized for consumer/edge devices
        this.modelName = this.configService.get<string>('OLLAMA_MODEL') || 'gemma4:e4b';
    }

    private readonly dbContextCache: Map<string, { data: string; timestamp: number }> = new Map();
    private readonly CACHE_TTL_MS = 60 * 1000; // 60s TTL for fast local caching

    private static readonly DICTIONARY: Record<string, string> = {
        // Calibration & Equipment
        'clibration': 'calibration',
        'calibratn': 'calibration',
        'calib': 'calibration',
        'eqip': 'equipment',
        'eqp': 'equipment',
        'equiptment': 'equipment',
        'equipments': 'equipment',
        'instrumnt': 'instrument',
        'gauge': 'equipment',
        'gauges': 'equipment',
        'tool': 'equipment',
        'maintanance': 'maintenance',
        'maintence': 'maintenance',

        // Audit
        'auditt': 'audit',
        'audits': 'audit',
        'auditer': 'auditor',
        'audite': 'auditee',
        'schedul': 'schedule',
        'schedulem': 'schedule',
        'planing': 'plan',

        // Document & SOP
        'doc': 'document',
        'docs': 'document',
        'sops': 'sop',
        'polcy': 'policy',
        'procedur': 'procedure',
        'manuals': 'manual',
        'manul': 'manual',

        // Deviations & Risk & MOC
        'deveation': 'deviation',
        'devation': 'deviation',
        'rejection': 'deviation',
        'defect': 'deviation',
        'defects': 'deviation',
        'rsk': 'risk',
        'mitigatn': 'mitigation',
        'swott': 'swot',
        'chng': 'change',
    };

    /**
     * Pre-processes raw user prompt to correct common typos, map synonyms,
     * and normalize intent for better AI understanding and faster DB lookup.
     */
    public convertPrompt(rawPrompt: string): { original: string; normalized: string; correctedTerms: string[] } {
        if (!rawPrompt || typeof rawPrompt !== 'string') {
            return { original: rawPrompt || '', normalized: rawPrompt || '', correctedTerms: [] };
        }

        const correctedTerms: string[] = [];
        const words = rawPrompt.split(/(\s+|[^\w\s])/);

        const processedWords = words.map(token => {
            const lower = token.toLowerCase();
            if (AiService.DICTIONARY[lower]) {
                correctedTerms.push(`${token} → ${AiService.DICTIONARY[lower]}`);
                return AiService.DICTIONARY[lower];
            }
            return token;
        });

        const normalized = processedWords.join('');
        return {
            original: rawPrompt,
            normalized,
            correctedTerms,
        };
    }



    private async getDatabaseContext(message: string): Promise<string> {
        const cacheKey = message.toLowerCase().trim();
        const cached = this.dbContextCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
            return cached.data;
        }

        const queryLower = message.toLowerCase();
        const contextParts: string[] = [];
        const today = new Date();

        // Standard system departments for fallback matching
        const systemDepts = ['tempering', 'furnace', 'annealed packing', 'annealed', 'packing', 'warehouse', 'quality', 'qc', 'qa', 'quality assurance', 'hr', 'mr', 'maintenance', 'store', 'production', 'planning', 'purchase', 'sales', 'safety', 'ehs', 'utility', 'lab'];
        const matchedDepts = systemDepts.filter(d => queryLower.includes(d));

        // Global System Status Summary (extremely fast counts to give the AI a high-level system map)
        try {
            const [docCount, approvedDocsCount, eqCount, overdueEqCount, prodDevCount, procDevCount, mocCount] = await Promise.all([
                this.docRepo.count(),
                this.docRepo.count({ where: { status: 'approved' as any } }),
                this.eqRepo.count(),
                this.eqRepo.count({ where: { status: 'active' as any, nextCalibrationDate: LessThan(today) } }),
                this.prodDevRepo.count(),
                this.procDevRepo.count(),
                this.mocRepo.count()
            ]);

            contextParts.push(
                `### DMS Global Live Overview:\n` +
                `- Document Library: ${approvedDocsCount} Approved / ${docCount} Total\n` +
                `- Calibration & Instruments: ${overdueEqCount} Overdue / ${eqCount} Total\n` +
                `- Deviations: ${prodDevCount} Product / ${procDevCount} Process\n` +
                `- Management of Change (MOC): ${mocCount} Records\n`
            );
        } catch (e) {
            this.logger.error('Failed to query global DMS summary', e.message);
        }

        // 1. Audit / Participant Check
        if (
            queryLower.includes('audit') || 
            queryLower.includes('schedule') || 
            queryLower.includes('plan') || 
            queryLower.includes('auditor') || 
            queryLower.includes('auditee') ||
            queryLower.includes('participant') ||
            queryLower.includes('june') || queryLower.includes('july') || queryLower.includes('august')
        ) {
            try {
                // Fetch participants selectively or search by name if present
                const queryWords = queryLower.split(/[^a-z0-9]/).filter(w => w.length > 2 && !['audit', 'plan', 'schedule', 'june', 'july', 'august'].includes(w));
                let matchedParticipants: AuditParticipant[] = [];
                if (queryWords.length > 0) {
                    matchedParticipants = await this.participantRepo.find({
                        where: queryWords.map(w => ({ name: ILike(`%${w}%`) }))
                    });
                }

                // Get participant and auditor/auditee counts directly
                const auditorsCount = await this.participantRepo.count({ where: { type: 'auditor' as any } });
                const auditeesCount = await this.participantRepo.count({ where: { type: 'auditee' as any } });

                let auditText = `### Audit System Status:\n` +
                    `- Total Auditors: ${auditorsCount}\n` +
                    `- Total Auditees: ${auditeesCount}\n\n`;

                if (matchedParticipants.length > 0) {
                    auditText += `### Matched Audit Participants:\n` +
                        matchedParticipants.map(p => `- Name: ${p.name}, Email: ${p.email}, Type: ${p.type.toUpperCase()}, Department: ${p.department || 'N/A'}`).join('\n') + '\n\n';
                }

                // Audit Month plans checks
                const monthMapping: { [key: string]: string } = {
                    january: '01', jan: '01',
                    february: '02', feb: '02',
                    march: '03', mar: '03',
                    april: '04', apr: '04',
                    may: '05',
                    june: '06', jun: '06',
                    july: '07', jul: '07',
                    august: '08', aug: '08',
                    september: '09', sep: '09',
                    october: '10', oct: '10',
                    november: '11', nov: '11',
                    december: '12', dec: '12'
                };

                const yearMatch = queryLower.match(/\b(20\d{2})\b/);
                const queryYearStr = yearMatch ? yearMatch[1] : today.getFullYear().toString();
                const queryYearNum = yearMatch ? parseInt(yearMatch[1], 10) : today.getFullYear();
                const matchedMonthNames = Object.keys(monthMapping).filter(m => queryLower.includes(m));

                if (matchedMonthNames.length > 0) {
                    const monthQueries: any[] = [];
                    for (const mName of matchedMonthNames) {
                        const mNum = monthMapping[mName];
                        if (yearMatch) {
                            monthQueries.push({ month: Like(`${queryYearStr}-${mNum}%`) });
                        } else {
                            monthQueries.push({ month: Like(`%-${mNum}%`) });
                        }
                    }

                    const monthPlans = await this.planRepo.find({ where: monthQueries });
                    if (monthPlans.length > 0) {
                        auditText += `### Audit Plans for Requested Months:\n` +
                            monthPlans.map(p => `- Dept: ${p.department}, Month: ${p.month}, Status: ${p.isPlanned ? 'Planned' : 'Unplanned'}, Outcome: ${p.outcome || 'Pending'}`).join('\n') + '\n\n';
                    }
                }

                // Schedules summary & list
                const schedulesCount = await this.schedRepo.count();
                const completedCount = await this.schedRepo.count({ where: { status: 'Completed' as any } });
                
                auditText += `### Audit Schedule Summary:\n` +
                    `- Total Audits Scheduled: ${schedulesCount}\n` +
                    `- Completed Audits: ${completedCount}\n\n`;

                // Fetch schedules if user asks for schedules, department, or a specific month/year
                if (queryLower.includes('schedule') || queryLower.includes('upcoming') || matchedDepts.length > 0 || matchedMonthNames.length > 0) {
                    const whereConditions: any[] = [];

                    // 1. Department match
                    if (matchedDepts.length > 0) {
                        matchedDepts.forEach(d => {
                            whereConditions.push({ department: ILike(`%${d}%`) });
                        });
                    }

                    // 2. Month/Year match
                    if (matchedMonthNames.length > 0) {
                        for (const mName of matchedMonthNames) {
                            const mNum = parseInt(monthMapping[mName], 10);
                            const startDate = new Date(queryYearNum, mNum - 1, 1);
                            const endDate = new Date(queryYearNum, mNum, 1);

                            if (whereConditions.length > 0) {
                                whereConditions.forEach(cond => {
                                    cond.date = Between(startDate, endDate);
                                });
                            } else {
                                whereConditions.push({ date: Between(startDate, endDate) });
                            }
                        }
                    }

                    const targetSchedules = await this.schedRepo.find({
                        where: whereConditions.length > 0 ? whereConditions : {},
                        relations: ['auditors'],
                        order: { date: 'DESC' }
                    });

                    if (targetSchedules.length > 0) {
                        auditText += `### Detailed Audit Schedules:\n` +
                            targetSchedules.map(s => `- Dept: ${s.department}, Date: ${new Date(s.date).toLocaleDateString()}, Scope: ${s.scope}, Status: ${s.status}, Auditors: ${s.auditors && s.auditors.length > 0 ? s.auditors.map(a => a.name).join(', ') : 'None'}`).join('\n') + '\n\n';
                    }
                }

                contextParts.push(auditText);
            } catch (e) {
                this.logger.error('Failed to query audits or participants for AI context', e.message);
            }
        }

        // 2. Equipment & Calibration check
        if (
            queryLower.includes('calibrat') || 
            queryLower.includes('equipment') || 
            queryLower.includes('instrument') || 
            queryLower.includes('measurement') || 
            queryLower.includes('maintenance') || 
            queryLower.includes('plunger') || 
            queryLower.includes('calib')
        ) {
            try {
                // Total counts
                const totalEq = await this.eqRepo.count();
                const activeEqCount = await this.eqRepo.count({ where: { status: 'active' as any } });
                const maintenanceEqCount = await this.eqRepo.count({ where: { status: In(['maintenance', 'inactive'] as any[]) } });
                const overdueEqCount = await this.eqRepo.count({ where: { status: 'active' as any, nextCalibrationDate: LessThan(today) } });

                let eqText = `### Calibration & Equipment Summary:\n` +
                    `- Total Instruments: ${totalEq}\n` +
                    `- Active Instruments: ${activeEqCount}\n` +
                    `- Under Maintenance / Inactive: ${maintenanceEqCount}\n` +
                    `- Overdue for Calibration: ${overdueEqCount}\n\n`;

                // Targeted equipment search (Ensure plunger or serial matches always work!)
                let matchedEq: Equipment[] = [];
                const searchTerms = queryLower.split(/[^a-z0-9]/).filter(w => w.length > 2 && !['due', 'sop', 'give', 'the', 'calibration', 'calib'].includes(w));
                if (searchTerms.length > 0) {
                    matchedEq = await this.eqRepo.find({
                        where: [
                            ...searchTerms.map(term => ({ name: ILike(`%${term}%`) })),
                            ...searchTerms.map(term => ({ equipmentNumber: ILike(`%${term}%`) }))
                        ]
                    });
                }
                if (matchedEq.length > 0) {
                    eqText += `### Matched Instruments:\n` +
                        matchedEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Location: ${e.location || 'N/A'}, Dept: ${e.department}, Status: ${e.status}, Next Calib: ${e.nextCalibrationDate ? new Date(e.nextCalibrationDate).toLocaleDateString() : 'N/A'}`).join('\n') + '\n\n';
                }

                // If asking about overdue
                if (queryLower.includes('overdue') || queryLower.includes('due') || queryLower.includes('pending')) {
                    const overdueEq = await this.eqRepo.find({
                        where: { status: 'active' as any, nextCalibrationDate: LessThan(today) },
                        order: { nextCalibrationDate: 'ASC' }
                    });
                    if (overdueEq.length > 0) {
                        eqText += `### Overdue Instruments (Total: ${overdueEq.length}):\n` +
                            overdueEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Dept: ${e.department}, Next Calib: ${e.nextCalibrationDate ? new Date(e.nextCalibrationDate).toLocaleDateString() : 'N/A'}`).join('\n') + '\n\n';
                    } else {
                        eqText += `### Overdue Instruments:\n- No active instruments are overdue for calibration.\n\n`;
                    }
                }

                // If asking about maintenance
                if (queryLower.includes('maintenance') || queryLower.includes('inactive')) {
                    const maintenanceEq = await this.eqRepo.find({
                        where: { status: In(['maintenance', 'inactive'] as any[]) }
                    });
                    if (maintenanceEq.length > 0) {
                        eqText += `### Instruments under Maintenance / Inactive (Total: ${maintenanceEq.length}):\n` +
                            maintenanceEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Dept: ${e.department}, Status: ${e.status}`).join('\n') + '\n\n';
                    }
                }

                // Filter by department (if no matched equipment details are listed)
                if (matchedDepts.length > 0 && matchedEq.length === 0) {
                    const deptEq = await this.eqRepo.find({
                        where: matchedDepts.map(d => ({ department: ILike(`%${d}%`) }))
                    });
                    if (deptEq.length > 0) {
                        eqText += `### Instruments in Requested Departments (Total: ${deptEq.length}):\n` +
                            deptEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Status: ${e.status}, Dept: ${e.department}`).join('\n') + '\n\n';
                    }
                }

                contextParts.push(eqText);
            } catch (e) {
                this.logger.error('Failed to query equipment for AI context', e.message);
            }
        }

        // 3. Document check
        if (
            queryLower.includes('document') || 
            queryLower.includes('sop') || 
            queryLower.includes('policy') || 
            queryLower.includes('procedure') || 
            queryLower.includes('manual') || 
            queryLower.includes('format')
        ) {
            try {
                // Counts
                const totalDocs = await this.docRepo.count();
                const approvedDocsCount = await this.docRepo.count({ where: { status: 'approved' as any } });
                const draftDocsCount = await this.docRepo.count({ where: { status: 'draft' as any } });
                const reviewDocsCount = await this.docRepo.count({ where: { status: 'under_review' as any } });

                let docText = `### Document Management System Summary:\n` +
                    `- Total Documents: ${totalDocs}\n` +
                    `- Approved Documents: ${approvedDocsCount}\n` +
                    `- Draft Documents: ${draftDocsCount}\n` +
                    `- Under Review Documents: ${reviewDocsCount}\n\n`;

                // Specific document search by title or number (token-based check)
                let matchedDocs: Document[] = [];
                const docSearchTerms = queryLower.split(/[^a-z0-9]/).filter(w => w.length > 2 && !['sop', 'sop/work', 'instruction', 'procedure', 'policy', 'manual', 'document', 'give', 'summary', 'show'].includes(w));
                if (docSearchTerms.length > 0) {
                    matchedDocs = await this.docRepo.find({
                        where: [
                            ...docSearchTerms.map(term => ({ title: ILike(`%${term}%`) })),
                            ...docSearchTerms.map(term => ({ documentNumber: ILike(`%${term}%`) }))
                        ],
                        take: 5
                    });
                }
                
                // Fallback for line-specific matches (e.g. TL1, TL3)
                if (matchedDocs.length === 0) {
                    const lines = ['tl1', 'tl3', 'tl4', 'tl6', 'tl7', 'tl8'];
                    const matchedLines = lines.filter(l => queryLower.includes(l));
                    if (matchedLines.length > 0) {
                        matchedDocs = await this.docRepo.find({
                            where: matchedLines.map(l => ({ title: ILike(`%${l}%`) })),
                            take: 5
                        });
                    }
                }

                if (matchedDocs.length > 0) {
                    docText += `### Matched Documents:\n` +
                        matchedDocs.map(d => {
                            const okfMeta = this.kbService.getOkfMetadata(d.id);
                            const summaryText = okfMeta ? `\n  * OKF Summary: ${okfMeta.summary}` : '';
                            return `- Title: ${d.title}, Number: ${d.documentNumber || 'N/A'}, Type: ${d.type}, Status: ${(d.status as string).toUpperCase()}, Departments: ${d.departments ? d.departments.join(', ') : 'All'}${summaryText}`;
                        }).join('\n') + '\n\n';
                }

                // If filtering by document type (SOP/WI, Procedure, Formats, Policy, Manual) or Department
                let allDocs = await this.docRepo.find(); // Fetch all documents from DB for aggregation

                // Extract all matched departments from query (dynamic match against DB + system list)
                const matchedDeptsInQuery = new Set<string>();
                allDocs.forEach(d => {
                    const deptList: string[] = Array.isArray(d.departments) 
                        ? d.departments 
                        : typeof d.departments === 'string' 
                            ? (d.departments as string).split(',') 
                            : [];
                    deptList.forEach(deptStr => {
                        const dNorm = deptStr.trim().toLowerCase();
                        if (dNorm && (queryLower.includes(dNorm) || message.toLowerCase().includes(dNorm))) {
                            matchedDeptsInQuery.add(dNorm);
                        }
                    });
                });

                matchedDepts.forEach(md => matchedDeptsInQuery.add(md.toLowerCase()));

                if (queryLower.includes('quality') || message.toLowerCase().includes('quality') || queryLower.includes('qa') || queryLower.includes('qc')) {
                    matchedDeptsInQuery.add('quality');
                    matchedDeptsInQuery.add('qa');
                    matchedDeptsInQuery.add('qc');
                }

                // Determine target structured document type from prompt
                const isSopQuery = queryLower.includes('sop') || message.toLowerCase().includes('sop') || queryLower.includes('work instruction') || message.toLowerCase().includes('work instruction') || queryLower.includes('wi');
                const isProcQuery = queryLower.includes('procedure');
                const isPolicyQuery = queryLower.includes('policy');
                const isFormatQuery = queryLower.includes('format') || queryLower.includes('form') || queryLower.includes('record');
                const isManualQuery = queryLower.includes('manual');
                const isMocQuery = queryLower.includes('moc');

                const isFilteredQuery = matchedDeptsInQuery.size > 0 || isSopQuery || isProcQuery || isPolicyQuery || isFormatQuery || isManualQuery || isMocQuery;

                if (isFilteredQuery) {
                    let filteredDocs = allDocs;

                    // 1. Filter by Department if specified
                    if (matchedDeptsInQuery.size > 0) {
                        const deptTargets = Array.from(matchedDeptsInQuery);
                        filteredDocs = filteredDocs.filter(d => {
                            if (!d.departments) return false;
                            const deptList: string[] = Array.isArray(d.departments) 
                                ? d.departments 
                                : typeof d.departments === 'string' 
                                    ? (d.departments as string).split(',') 
                                    : [];
                            return deptList.some(deptStr => {
                                const deptNorm = deptStr.trim().toLowerCase();
                                return deptTargets.some(md => {
                                    if ((md === 'quality' || md === 'qc' || md === 'qa') && 
                                        (deptNorm.includes('quality') || deptNorm.includes('qc') || deptNorm.includes('qa'))) {
                                        return true;
                                    }
                                    return deptNorm.includes(md) || md.includes(deptNorm);
                                });
                            });
                        });
                    }

                    // 2. Filter by Structured Document Type metadata
                    if (isSopQuery) {
                        filteredDocs = filteredDocs.filter(d => {
                            const typeLower = (d.type || '').toLowerCase().trim();
                            const titleLower = (d.title || '').toLowerCase().trim();
                            const docNumLower = (d.documentNumber || '').toLowerCase().trim();
                            return (
                                typeLower === 'work_instruction' || 
                                typeLower === 'sop' || 
                                typeLower === 'wi' ||
                                typeLower === 'procedure' ||
                                titleLower.includes('sop') || 
                                titleLower.includes('work instruction') || 
                                titleLower.includes('operation') ||
                                docNumLower.includes('/l3/') ||
                                docNumLower.includes('/l2/')
                            );
                        });
                    } else if (isProcQuery) {
                        filteredDocs = filteredDocs.filter(d => {
                            const typeLower = (d.type || '').toLowerCase().trim();
                            const docNumLower = (d.documentNumber || '').toLowerCase().trim();
                            return typeLower === 'procedure' || docNumLower.includes('/l2/');
                        });
                    } else if (isPolicyQuery) {
                        filteredDocs = filteredDocs.filter(d => {
                            const typeLower = (d.type || '').toLowerCase().trim();
                            const docNumLower = (d.documentNumber || '').toLowerCase().trim();
                            return typeLower === 'policy' || docNumLower.includes('/l1/');
                        });
                    } else if (isFormatQuery) {
                        filteredDocs = filteredDocs.filter(d => {
                            const typeLower = (d.type || '').toLowerCase().trim();
                            const docNumLower = (d.documentNumber || '').toLowerCase().trim();
                            return typeLower === 'form' || typeLower === 'record' || typeLower === 'format' || docNumLower.includes('/l4/');
                        });
                    } else if (isManualQuery) {
                        filteredDocs = filteredDocs.filter(d => {
                            const typeLower = (d.type || '').toLowerCase().trim();
                            return typeLower === 'manual' || d.title.toLowerCase().includes('manual');
                        });
                    }

                    const typeHeader = isSopQuery ? 'SOP / Work Instruction' : isProcQuery ? 'Procedure' : isPolicyQuery ? 'Policy' : isFormatQuery ? 'Form / Format / Record' : isManualQuery ? 'Manual' : 'All Document Types';
                    const deptHeader = matchedDeptsInQuery.size > 0 ? `in ${Array.from(matchedDeptsInQuery).map(d => d.toUpperCase()).join('/')} Department` : 'All Departments';

                    const appCount = filteredDocs.filter(d => (d.status as string) === 'approved').length;
                    const draftCount = filteredDocs.filter(d => (d.status as string) === 'draft').length;
                    const revCount = filteredDocs.filter(d => (d.status as string) === 'under_review').length;

                    docText += `### Department & Document Type Filter Results (${typeHeader} ${deptHeader}):\n` +
                        `- EXACT TOTAL MATCHING DOCUMENTS: ${filteredDocs.length}\n` +
                        `- Approved Documents: ${appCount}\n` +
                        `- Draft Documents: ${draftCount}\n` +
                        `- Under Review Documents: ${revCount}\n\n`;

                    if (filteredDocs.length > 0) {
                        docText += `### Exact Matching Documents (PRESENT TO USER AS A MARKDOWN TABLE):\n` +
                            `| Document Name | Document Number | Type | Status | Department |\n` +
                            `| :--- | :--- | :--- | :--- | :--- |\n` +
                            filteredDocs.map(d => `| ${d.title} | ${d.documentNumber || 'N/A'} | ${d.type} | ${(d.status as string).toUpperCase()} | ${Array.isArray(d.departments) ? d.departments.join(', ') : (d.departments || 'All')} |`).join('\n') + '\n\n';
                    } else {
                        docText += `- No documents found for this filter combination.\n\n`;
                    }
                }

                contextParts.push(docText);
            } catch (e) {
                this.logger.error('Failed to query documents for AI context', e.message);
            }
        }

        // 4. Risks (HIRA / EAA / QRA)
        if (
            queryLower.includes('risk') || 
            queryLower.includes('hira') || 
            queryLower.includes('hazard') || 
            queryLower.includes('eaa') || 
            queryLower.includes('qra') || 
            queryLower.includes('threat') ||
            queryLower.includes('severity')
        ) {
            try {
                // Get high risk counts directly
                const hiraCount = await this.hiraRepo.count();
                const eaaCount = await this.eaaRepo.count();
                const qraCount = await this.qraRepo.count();

                const hiraHighCount = await this.hiraRepo.count({ where: { maxRiskLevel: In(['high', 'critical'] as any[]) } });
                const eaaHighCount = await this.eaaRepo.count({ where: { maxRiskLevel: In(['high', 'critical'] as any[]) } });
                const qraHighCount = await this.qraRepo.count({ where: { maxRiskLevel: In(['high', 'critical'] as any[]) } });

                let riskText = `### Hazard & Risk Assessment Summary:\n` +
                    `- HIRA (Occupational Safety): Total: ${hiraCount}, Critical/High ("Red" Risks): ${hiraHighCount}\n` +
                    `- EAA (Environmental Aspect): Total: ${eaaCount}, Critical/High Risks: ${eaaHighCount}\n` +
                    `- QRA (Quality Risks): Total: ${qraCount}, Critical/High Risks: ${qraHighCount}\n\n`;

                // If asking about critical risks, fetch details
                if (queryLower.includes('critical') || queryLower.includes('high') || queryLower.includes('red') || queryLower.includes('severity')) {
                    const hiraHigh = await this.hiraRepo.find({ where: { maxRiskLevel: In(['high', 'critical'] as any[]) } });
                    const eaaHigh = await this.eaaRepo.find({ where: { maxRiskLevel: In(['high', 'critical'] as any[]) } });
                    if (hiraHigh.length > 0) {
                        riskText += `### High HIRA (Occupational Safety) Risks (Total: ${hiraHigh.length}):\n` +
                            hiraHigh.map(r => `- No: ${r.riskNumber}, Activity: ${r.activity}, Task: ${r.task || 'N/A'}, MaxLevel: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n\n';
                    }
                    if (eaaHigh.length > 0) {
                        riskText += `### High EAA (Environmental Aspect) Risks (Total: ${eaaHigh.length}):\n` +
                            eaaHigh.map(r => `- No: ${r.riskNumber}, Process: ${r.process}, Area: ${r.area || 'N/A'}, MaxLevel: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n\n';
                    }
                }

                // Dynamic department match for risks
                if (matchedDepts.length > 0) {
                    riskText += `### Filtered Risks for Requested Departments:\n`;
                    for (const dept of matchedDepts) {
                        const deptHira = await this.hiraRepo.find({
                            where: { department: ILike(`%${dept}%`) }
                        });
                        if (deptHira.length > 0) {
                            riskText += `For HIRA in ${dept.toUpperCase()} (Total: ${deptHira.length}):\n` + deptHira.map(r => `- RiskNo: ${r.riskNumber}, Activity: ${r.activity}, Risk: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n';
                        }
                    }
                }

                contextParts.push(riskText);
            } catch (e) {
                this.logger.error('Failed to query risks for AI context', e.message);
            }
        }

        // 5. Org Chart check
        if (
            queryLower.includes('org') || 
            queryLower.includes('chart') || 
            queryLower.includes('people') || 
            queryLower.includes('employee') || 
            queryLower.includes('hierarchy') || 
            queryLower.includes('designation') ||
            queryLower.includes('report')
        ) {
            try {
                const count = await this.orgRepo.count();
                const nodes = await this.orgRepo.find(); // Fetch all employees for accurate department & designation context

                let deptCounts: { [dept: string]: number } = {};
                nodes.forEach(n => {
                    const d = (n.department || 'Unassigned').trim();
                    deptCounts[d] = (deptCounts[d] || 0) + 1;
                });

                let orgText = `### Organization Chart Metadata:\n` +
                    `- Total Number of Employees Registered in System: ${count}\n` +
                    `- Department Breakdown: ${Object.entries(deptCounts).map(([d, c]) => `${d}: ${c}`).join(', ')}\n\n`;

                if (matchedDepts.length > 0) {
                    const filteredNodes = nodes.filter(n => matchedDepts.some(md => (n.department || '').toLowerCase().includes(md)));
                    orgText += `### Employees in Requested Department(s) (Total: ${filteredNodes.length}):\n` +
                        filteredNodes.map(n => `- Name: ${n.name}, Designation: ${n.designation || 'N/A'}, Department: ${n.department || 'N/A'}`).join('\n') + '\n\n';
                } else {
                    orgText += `### Organization Members:\n` +
                        nodes.map(n => `- Name: ${n.name}, Designation: ${n.designation || 'N/A'}, Department: ${n.department || 'N/A'}`).join('\n') + '\n\n';
                }

                contextParts.push(orgText);
            } catch (e) {
                this.logger.error('Failed to query org chart for AI context', e.message);
            }
        }

        // 5b. Specific Employee or Role Check (Matches names/designations dynamically and resolves reporting structure)
        try {
            // Check if any word in query matches an employee name or designation
            const searchWords = queryLower.split(/[^a-z0-9]/).filter(w => w.length > 2 && !['give', 'show', 'who', 'reports', 'the', 'chart', 'org'].includes(w));
            let matchedNodes: OrgNode[] = [];

            if (searchWords.length > 0) {
                matchedNodes = await this.orgRepo.find({
                    where: [
                        ...searchWords.map(w => ({ name: ILike(`%${w}%`) })),
                        ...searchWords.map(w => ({ designation: ILike(`%${w}%`) }))
                    ]
                });
            }

            if (matchedNodes.length > 0) {
                // Fetch all nodes to resolve reporting tree structure correctly in memory
                const allNodes = await this.orgRepo.find({ select: ['id', 'parentId', 'name', 'designation', 'department'] });
                const idToNameMap = new Map<string, string>();
                allNodes.forEach(n => idToNameMap.set(n.id, n.name));

                let matchedText = `### Matched Employees in Organization Chart:\n`;
                for (const node of matchedNodes) {
                    const managerName = node.parentId ? (idToNameMap.get(node.parentId) || 'Unknown') : 'None (Top of hierarchy)';
                    matchedText += `- Name: ${node.name}, Designation: ${node.designation || 'N/A'}, Department: ${node.department || 'N/A'}, Reports To: ${managerName}\n`;
                    
                    // Fetch direct reports to this matched employee
                    const reports = allNodes.filter(n => n.parentId === node.id);
                    if (reports.length > 0) {
                        matchedText += `  * Direct Reports to ${node.name} (Total: ${reports.length}):\n` +
                            reports.map(r => `    - Name: ${r.name}, Designation: ${r.designation || 'N/A'}, Department: ${r.department || 'N/A'}`).join('\n') + '\n';
                    }
                }
                contextParts.push(matchedText);
            }
        } catch (e) {
            this.logger.error('Failed to query specific names or roles in org chart for AI context', e.message);
        }

        // 6. Objectives/KPIs check
        if (queryLower.includes('objective') || queryLower.includes('kpi') || queryLower.includes('target') || queryLower.includes('goal')) {
            try {
                const totalObj = await this.objRepo.count();
                const activeObj = await this.objRepo.count({ where: { status: In(['Active', 'In Progress'] as any[]) } });
                const achievedObj = await this.objRepo.count({ where: { status: 'Achieved' as any } });

                let objText = `### Objectives & Targets Summary:\n` +
                    `- Total Objectives: ${totalObj}\n` +
                    `- Active Objectives: ${activeObj}\n` +
                    `- Achieved Objectives: ${achievedObj}\n\n`;

                // If asking about specific department objectives
                let targetObjs: Objective[] = [];
                if (matchedDepts.length > 0) {
                    targetObjs = await this.objRepo.find({
                        where: matchedDepts.map(d => ({ department: ILike(`%${d}%`) }))
                    });
                } else {
                    targetObjs = await this.objRepo.find();
                }

                if (targetObjs.length > 0) {
                    objText += `### Objectives List (Total: ${targetObjs.length}):\n` +
                        targetObjs.map(o => `- No: ${o.objectiveNumber}, Name: ${o.name}, Type: ${o.type}, Dept: ${o.department || 'N/A'}, Target: ${o.target} ${o.uom || ''}, Status: ${o.status}`).join('\n');
                }

                contextParts.push(objText);
            } catch (e) {
                this.logger.error('Failed to query objectives for AI context', e.message);
            }
        }

        // 7. SWOT check
        if (queryLower.includes('swot') || queryLower.includes('strength') || queryLower.includes('weakness') || queryLower.includes('opportunity') || queryLower.includes('threat') || queryLower.includes('context')) {
            try {
                const totalSwots = await this.swotRepo.count();
                const swots = await this.swotRepo.find(); // Fetch all SWOT issues for accurate context

                if (swots.length > 0) {
                    const strengths = swots.filter(s => s.category === 'strength');
                    const weaknesses = swots.filter(s => s.category === 'weakness');
                    const opportunities = swots.filter(s => s.category === 'opportunity');
                    const threats = swots.filter(s => s.category === 'threat');

                    let swotText = `### SWOT Analysis Summary (Total: ${totalSwots}):\n` +
                        `- Strengths: ${strengths.length}, Weaknesses: ${weaknesses.length}, Opportunities: ${opportunities.length}, Threats: ${threats.length}\n\n`;

                    if (queryLower.includes('threat') || queryLower.includes('impact') || queryLower.includes('context') || queryLower.includes('high')) {
                        swotText += `### SWOT Threats (Total: ${threats.length}):\n` +
                            threats.map(t => `- Threat: ${t.text}, Impact: ${t.impact.toUpperCase()}, Standards: ${t.standards ? t.standards.join(', ') : 'None'}`).join('\n') + '\n\n';
                    }
                    if (queryLower.includes('opportunity') || queryLower.includes('context')) {
                        swotText += `### SWOT Opportunities (Total: ${opportunities.length}):\n` +
                            opportunities.map(o => `- Opportunity: ${o.text}, Impact: ${o.impact.toUpperCase()}, Standards: ${o.standards ? o.standards.join(', ') : 'None'}`).join('\n') + '\n\n';
                    }
                    if (queryLower.includes('strength') || queryLower.includes('weakness') || queryLower.includes('context')) {
                        swotText += `### SWOT Strengths & Weaknesses:\n` +
                            swots.filter(s => s.category === 'strength' || s.category === 'weakness')
                                 .map(s => `- Category: ${s.category.toUpperCase()}, Text: ${s.text}, Impact: ${s.impact.toUpperCase()}`).join('\n');
                    }

                    contextParts.push(swotText);
                }
            } catch (e) {
                this.logger.error('Failed to query SWOT issues for AI context', e.message);
            }
        }

        // 8. Interested Parties (Needs & Expectations)
        if (
            queryLower.includes('need') || 
            queryLower.includes('expectation') || 
            queryLower.includes('interested') || 
            queryLower.includes('party') || 
            queryLower.includes('parties') || 
            queryLower.includes('expect')
        ) {
            try {
                const totalIp = await this.interestedRepo.count();
                let ipList: InterestedParty[] = [];

                const partyNames = ['employee', 'customer', 'supplier', 'government', 'shareholder'];
                const matchedParties = partyNames.filter(p => queryLower.includes(p));

                if (matchedParties.length > 0) {
                    ipList = await this.interestedRepo.find({
                        where: matchedParties.map(p => ({ name: ILike(`%${p}%`) }))
                    });
                } else {
                    ipList = await this.interestedRepo.find();
                }

                if (ipList.length > 0) {
                    contextParts.push(
                        `### Interested Parties (Needs & Expectations, Total: ${totalIp}):\n` +
                        ipList.map(ip => `- Party Name: ${ip.name}\n  Needs & Expectations: ${ip.needs}\n  Risk Rating: ${ip.risk}\n  Actions: ${ip.actions && ip.actions.length > 0 ? ip.actions.join(', ') : 'None'}\n  Responsible: ${ip.responsible || 'N/A'}`).join('\n\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query Interested Parties for AI context', e.message);
            }
        }

        // 9. Deviation check
        if (queryLower.includes('deviation') || queryLower.includes('non-conformance') || queryLower.includes('defect') || queryLower.includes('reject') || queryLower.includes('nonconformance')) {
            try {
                const totalProd = await this.prodDevRepo.count();
                const totalProc = await this.procDevRepo.count();

                let devText = `### Product & Process Deviations Summary:\n` +
                    `- Total Product Deviations: ${totalProd}\n` +
                    `- Total Process Deviations: ${totalProc}\n\n`;

                let targetProd: ProductDeviation[] = [];
                let targetProc: ProcessDeviation[] = [];

                if (matchedDepts.length > 0) {
                    targetProc = await this.procDevRepo.find({
                        where: matchedDepts.map(d => ({ department: ILike(`%${d}%`) }))
                    });
                } else {
                    targetProd = await this.prodDevRepo.find();
                    targetProc = await this.procDevRepo.find();
                }

                if (targetProd.length > 0 && (queryLower.includes('product') || !queryLower.includes('process'))) {
                    devText += `### Product Deviations (Total: ${targetProd.length}):\n` +
                        targetProd.map(d => `- Serial: ${d.serialNumber}, Line: ${d.line}, Nature: ${d.natureOfDeviation || 'N/A'}, Status: ${d.status}`).join('\n') + '\n\n';
                }

                if (targetProc.length > 0 && (queryLower.includes('process') || !queryLower.includes('product'))) {
                    devText += `### Process Deviations (Total: ${targetProc.length}):\n` +
                        targetProc.map(d => `- Serial: ${d.serialNumber}, Dept: ${d.department}, Line: ${d.line}, Nature: ${d.natureOfDeviation || 'N/A'}, Status: ${d.status}`).join('\n') + '\n\n';
                }

                contextParts.push(devText);
            } catch (e) {
                this.logger.error('Failed to query deviations for AI context', e.message);
            }
        }

        // 10. MOC check
        if (queryLower.includes('moc') || queryLower.includes('change') || queryLower.includes('management of change')) {
            try {
                const totalMocs = await this.mocRepo.count();
                const activeMocsCount = await this.mocRepo.count({ where: { status: In(['Approved', 'Finalized'] as any[]) } });

                let mocText = `### Management of Change (MOC) Summary:\n` +
                    `- Total MOC Records: ${totalMocs}\n` +
                    `- Active/Under Review MOCs: ${totalMocs - activeMocsCount}\n` +
                    `- Approved/Finalized MOCs: ${activeMocsCount}\n\n`;

                let targetMocs: MocRecord[] = [];
                if (matchedDepts.length > 0) {
                    targetMocs = await this.mocRepo.find({
                        where: matchedDepts.map(d => ({ department: ILike(`%${d}%`) }))
                    });
                } else {
                    targetMocs = await this.mocRepo.find();
                }

                if (targetMocs.length > 0) {
                    mocText += `### MOC Records List (Total: ${targetMocs.length}):\n` +
                        targetMocs.map(m => `- MOC No: ${m.mocNo}, Dept: ${m.department}, Product/Process: ${m.productProcess}, Status: ${m.status}, Description: ${m.description}`).join('\n');
                }

                contextParts.push(mocText);
            } catch (e) {
                this.logger.error('Failed to query MOC records for AI context', e.message);
            }
        }

        const resultText = contextParts.length === 0 
            ? '' 
            : `\nRetrieved System Database Information:\n${contextParts.join('\n\n')}\n`;

        this.dbContextCache.set(cacheKey, { data: resultText, timestamp: Date.now() });
        return resultText;
    }

    private getLocalRules(): string {
        try {
            const filePath = path.join(process.cwd(), 'dms_rules.md');
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
        } catch (e) {
            this.logger.error('Failed to read dms_rules.md', e.message);
        }
        return '';
    }    /**
     * Gets the active model name and provider from database system settings, 
     * falling back to environment configuration.
     */
    async getActiveModel(): Promise<{ name: string; provider: 'ollama' | 'gemini' | 'openai' }> {
        try {
            const setting = await this.settingsRepo.findOne({ where: { key: 'active_ai_model' } });
            if (setting && setting.value) {
                if (setting.value.name && setting.value.provider) {
                    return setting.value;
                }
                const name = String(setting.value);
                const provider = name.startsWith('gemini') ? 'gemini' : (name.startsWith('gpt') ? 'openai' : 'ollama');
                return { name, provider };
            }
        } catch (e) {
            this.logger.error('Failed to load active model setting', e.message);
        }
        const defaultName = this.configService.get<string>('OLLAMA_MODEL') || 'gemma2:2b';
        return { name: defaultName, provider: 'ollama' };
    }

    /**
     * Helper to format model names for cleaner UI presentation.
     */
    private formatModelName(name: string): string {
        if (!name) return 'Local AI';
        const baseName = name.split(':')[0];
        return baseName
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2');
    }

    /**
     * Retrieves all available local models from Ollama and cloud models
     * that are set up with backend API keys.
     */
    async getAvailableModels(): Promise<any> {
        const activeModel = await this.getActiveModel();
        
        let localModels: { name: string; displayName: string }[] = [];
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 })
            );
            if (response.data && response.data.models) {
                localModels = response.data.models.map((m: any) => ({
                    name: m.name,
                    displayName: `${this.formatModelName(m.name)} (Local)`
                }));
            }
        } catch (e) {
            this.logger.warn(`Failed to fetch Ollama local models: ${e.message}`);
        }
        
        const defaultLocalModel = this.configService.get<string>('OLLAMA_MODEL') || 'gemma2:2b';
        if (!localModels.some(m => m.name === defaultLocalModel)) {
            localModels.unshift({
                name: defaultLocalModel,
                displayName: `${this.formatModelName(defaultLocalModel)} (Default Local)`
            });
        }
        
        const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
        const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
        
        const cloudModels = [
            {
                name: 'gemini-1.5-flash',
                displayName: 'Gemini 1.5 Flash (Cloud)',
                provider: 'gemini' as const,
                available: !!geminiApiKey
            },
            {
                name: 'gemini-1.5-pro',
                displayName: 'Gemini 1.5 Pro (Cloud)',
                provider: 'gemini' as const,
                available: !!geminiApiKey
            },
            {
                name: 'gemini-2.5-flash',
                displayName: 'Gemini 2.5 Flash (Cloud)',
                provider: 'gemini' as const,
                available: !!geminiApiKey
            },
            {
                name: 'gpt-4o-mini',
                displayName: 'GPT-4o Mini (Cloud)',
                provider: 'openai' as const,
                available: !!openaiApiKey
            },
            {
                name: 'gpt-4o',
                displayName: 'GPT-4o (Cloud)',
                provider: 'openai' as const,
                available: !!openaiApiKey
            }
        ];
        
        return {
            activeModel,
            localModels,
            cloudModels
        };
    }

    /**
     * Persists the selected active AI model and provider in system settings.
     */
    async selectModel(name: string, provider: 'ollama' | 'gemini' | 'openai'): Promise<any> {
        let setting = await this.settingsRepo.findOne({ where: { key: 'active_ai_model' } });
        if (!setting) {
            setting = this.settingsRepo.create({ key: 'active_ai_model', value: { name, provider } });
        } else {
            setting.value = { name, provider };
        }
        return this.settingsRepo.save(setting);
    }

    /**
     * Helper to call AI models directly without streaming, dynamically routing
     * to Ollama, Gemini, or OpenAI based on the active model configuration.
     */
    private async generateChatCompletionDirect(
        prompt: string,
        systemPrompt: string,
        temperature = 0.7,
        numCtx = 2048
    ): Promise<string> {
        const activeModel = await this.getActiveModel();
        
        if (activeModel.provider === 'ollama') {
            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: activeModel.name,
                    prompt: prompt,
                    system: systemPrompt,
                    stream: false,
                    keep_alive: '20m',
                    options: {
                        temperature,
                        num_ctx: numCtx,
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 240000,
                })
            );
            
            let data = response.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            if (data && data.response) {
                return data.response.trim();
            }
            throw new Error('Invalid response structure from Ollama');
        } else {
            const isGemini = activeModel.provider === 'gemini';
            const apiKeyEnv = isGemini ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
            const apiKey = this.configService.get<string>(apiKeyEnv);
            
            if (!apiKey) {
                throw new Error(`API Key for ${activeModel.provider} is not configured in backend .env`);
            }
            
            const url = isGemini 
                ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' 
                : 'https://api.openai.com/v1/chat/completions';
            
            const response = await firstValueFrom(
                this.httpService.post(url, {
                    model: activeModel.name,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature,
                    stream: false
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                })
            );
            
            let data = response.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            if (data && data.choices?.[0]?.message?.content) {
                return data.choices[0].message.content.trim();
            }
            throw new Error(`Invalid response structure from ${activeModel.provider}`);
        }
    }

    /**
     * Sends a chat prompt to the active AI model (Ollama, Gemini, or OpenAI)
     * and returns the full response content synchronously.
     */
    async chat(message: string, context?: string): Promise<{ response: string; model: string }> {
        const promptConversion = this.convertPrompt(message);
        const effectiveMessage = promptConversion.normalized;
        if (promptConversion.correctedTerms.length > 0) {
            this.logger.log(`PromptConverter corrected terms: ${promptConversion.correctedTerms.join(', ')}`);
        }

        const dbContext = await this.getDatabaseContext(effectiveMessage);
        const localRules = this.getLocalRules();
        
        const queryLower = effectiveMessage.toLowerCase();
        let kbLimit = 3;
        if (queryLower.includes('summary') || queryLower.includes('list') || queryLower.includes('how many') || queryLower.includes('count')) {
            kbLimit = 1;
        }
        
        const kbMatches = await this.kbService.search(effectiveMessage, kbLimit);
        const kbContext = kbMatches.length > 0
            ? `\nRetrieved Local Knowledge Base Documents:\n${kbMatches.map((m, i) => `[Document Snippet ${i + 1}]:\n${m}`).join('\n\n')}\n`
            : '';

        const systemPrompt = `You are the DMS Copilot, an expert AI Consultant in Integrated Management Systems (IMS) specializing in ISO 9001:2015 (Quality), ISO 14001:2015 (Environmental), and ISO 45001:2018 (Occupational Health & Safety).

Your goal is to assist users with documents, audits, calibration, risk management, SWOT context, objectives, deviations, and management of change (MOC) by framing your responses through the lens of ISO compliance:
- Frame audits in context of **ISO Clause 9.2 (Internal Audit)**.
- Frame risk assessments (HIRA, EAA, QRA) in context of **ISO Clause 6.1 (Actions to address risks and opportunities)**.
- Frame equipment and calibration in context of **ISO 9001 Clause 7.1.5 (Monitoring and measuring resources)**.
- Frame organization chart and roles in context of **ISO Clause 5.3 (Organizational roles, responsibilities and authorities)**.
- Frame document control (SOPs, drafts, reviews, approvals) in context of **ISO Clause 7.5 (Documented information)**.
- Frame SWOT analysis in context of **ISO Clause 4.1 (Understanding the organization and its context)**.
- Frame quality, safety, and environmental objectives in context of **ISO Clause 6.2 (Objectives and planning to achieve them)**.
- Frame product and process deviations in context of **ISO Clause 8.7 (Control of nonconforming outputs)** and **Clause 10.2 (Nonconformity and corrective action)**.
- Frame Management of Change (MOC) in context of **ISO Clause 6.3 (Planning of changes)** and **Clause 8.5.6 (Control of changes)**.

Be highly professional, structured, and compliant. Cite specific ISO clauses where relevant to reinforce compliance. Always reassure the user that all data is stored securely and processed privately.

**CRITICAL TABLE FORMATTING MANDATE:**
Whenever your response contains a list of database records or documents (such as SOPs, documents, calibration instruments, audit plans/schedules, risks, deviations, or MOC records), YOU MUST ALWAYS PRESENT THE RECORD LIST AS A MARKDOWN TABLE (e.g. | Document Title | Document Number | Type | Status | Department |). NEVER format record lists as numbered lists (1., 2., 3.) or bullet points.

**Crucial App-Specific Instructions:**
When users ask how to upload a new document or how to revise an existing document, you MUST guide them using the exact user-interface flow of this DMS application instead of giving generic answers:

1. **How to Upload a New Document**:
   - Navigate to the **Documents** page by clicking "Documents" in the sidebar navigation (or go to \`/documents\`).
   - Click the blue **"Create Document"** button (with the **Plus** icon) at the top-right corner of the page.
   - This opens the **Create Document Modal**. You must fill in the following details:
     - **Document Name / Title**
     - **Document Number** (e.g. for SOP numbering codes)
     - **Document Type** (select from the dropdown: SOP, Policy, Procedure, etc.)
     - **Departments** (select the department scope)
     - **Description**
   - Click the file upload area to select or drag your file.
   - Click the **"Upload"** / **"Create"** button to submit.

2. **How to Revise an Existing Document**:
   - Navigate to the **Documents** page (\`/documents\`).
   - Find your document in the table list and click on its name to open the **Document Detail Page** (e.g., \`/documents/:id\`).
   - In the top-right corner, click on the **"Revise Document"** button (if the document is approved) or **"Upload New Version"** button (if it is a draft or rejected).
   - This opens the **Upload Version Modal**.
   - Upload the new file version, enter your change/revision notes, and click submit.

3. **Link to DMS Pages**:
   Whenever you mention modules or list specific calibration equipment, documents, audit plans, risks, objectives, or MOC records, you MUST include a clean markdown link to the relevant section so the user can easily navigate there:
   - Calibration & Equipment page: [Calibration & Equipment](/calibration-equipment)
   - Documents library page: [Documents](/documents)
   - Risks Management page: [Risks](/risks)
   - SWOT Analysis page: [SWOT Analysis](/context-organization)
   - Quality/Safety/Environmental Objectives: [Objectives](/objectives)
   - Internal Audit planning/schedules: [Audit Plans](/internal-audit/plan)
   - Product Deviations page: [Product Deviations](/product-deviation)
   - Process Deviations page: [Process Deviations](/process-deviation)
   - Management of Change (MOC) page: [MOC Records](/moc)
   - Organization Chart: [Organization Chart](/org-chart)
   
   Example format: "Plunger calibration is overdue. For more details, you can [click here to access the Calibration & Equipment page](/calibration-equipment)."

Current Application Context:
${context || 'No specific page context provided.'}
${localRules ? `\nLocal DMS System Rules & Policies:\n${localRules}\n` : ''}
${kbContext}
${dbContext}

Please respond to the user's message accordingly.`;

        const activeModel = await this.getActiveModel();
        try {
            const responseText = await this.generateChatCompletionDirect(message, systemPrompt, 0.7, 8192);
            return {
                response: responseText,
                model: activeModel.name
            };
        } catch (error) {
            this.logger.error(`Error communicating with active AI model (${activeModel.name}):`, error.message);
            
            if (activeModel.provider === 'ollama' && (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED'))) {
                return {
                    response: `⚠️ DMS Copilot is currently offline. Please ensure Ollama is installed and running locally on your system, and that you have pulled the model using \`ollama pull ${activeModel.name}\`.`,
                    model: activeModel.name,
                };
            }

            return {
                response: `⚠️ Failed to get a response from AI model: ${error.message}`,
                model: activeModel.name,
            };
        }
    }

    /**
     * Sends a chat prompt to the active AI model and streams the response back token by token,
     * fully supporting client-driven Axios stream cancellation.
     */
    async chatStream(
        message: string, 
        context: string, 
        onChunk: (chunk: string) => void,
        signal?: AbortSignal
    ): Promise<void> {
        onChunk(`[STATUS] 🔍 Refining prompt & normalizing terms...\n`);
        const promptConversion = this.convertPrompt(message);
        const effectiveMessage = promptConversion.normalized;
        if (promptConversion.correctedTerms.length > 0) {
            this.logger.log(`PromptConverter corrected terms: ${promptConversion.correctedTerms.join(', ')}`);
            onChunk(`[STATUS] 🔍 Normalized terms: ${promptConversion.correctedTerms.join(', ')}\n`);
        }

        onChunk(`[STATUS] 🗂️ Searching live DMS database context...\n`);
        const dbContext = await this.getDatabaseContext(effectiveMessage);

        onChunk(`[STATUS] 📄 Matching document snippets & ISO clauses...\n`);
        const localRules = this.getLocalRules();
        
        const queryLower = effectiveMessage.toLowerCase();
        const isDbQuery = (queryLower.includes('how many') || queryLower.includes('which') || queryLower.includes('list') || queryLower.includes('show') || queryLower.includes('count')) && !queryLower.includes('explain') && !queryLower.includes('step') && !queryLower.includes('content');
        const kbLimit = isDbQuery ? 0 : 3;

        const kbMatches = kbLimit > 0 ? await this.kbService.search(effectiveMessage, kbLimit) : [];
        const kbContext = kbMatches.length > 0
            ? `\nRetrieved Local Knowledge Base Documents:\n${kbMatches.map((m, i) => `[Document Snippet ${i + 1}]:\n${m}`).join('\n\n')}\n`
            : '';

        onChunk(`[STATUS] ✨ Synthesizing response...\n`);

        const systemPrompt = `You are the DMS Copilot, an expert AI Consultant in Integrated Management Systems (IMS) specializing in ISO 9001:2015 (Quality), ISO 14001:2015 (Environmental), and ISO 45001:2018 (Occupational Health & Safety).

Your goal is to assist users with documents, audits, calibration, risk management, SWOT context, objectives, deviations, and management of change (MOC) by framing your responses through the lens of ISO compliance:
- Frame audits in context of **ISO Clause 9.2 (Internal Audit)**.
- Frame risk assessments (HIRA, EAA, QRA) in context of **ISO Clause 6.1 (Actions to address risks and opportunities)**.
- Frame equipment and calibration in context of **ISO 9001 Clause 7.1.5 (Monitoring and measuring resources)**.
- Frame organization chart and roles in context of **ISO Clause 5.3 (Organizational roles, responsibilities and authorities)**.
- Frame document control (SOPs, drafts, reviews, approvals) in context of **ISO Clause 7.5 (Documented information)**.
- Frame SWOT analysis in context of **ISO Clause 4.1 (Understanding the organization and its context)**.
- Frame quality, safety, and environmental objectives in context of **ISO Clause 6.2 (Objectives and planning to achieve them)**.
- Frame product and process deviations in context of **ISO Clause 8.7 (Control of nonconforming outputs)** and **Clause 10.2 (Nonconformity and corrective action)**.
- Frame Management of Change (MOC) in context of **ISO Clause 6.3 (Planning of changes)** and **Clause 8.5.6 (Control of changes)**.

Be highly professional, structured, and compliant. Cite specific ISO clauses where relevant to reinforce compliance. Always reassure the user that all data is stored securely and processed privately.

**CRITICAL TABLE FORMATTING MANDATE:**
Whenever your response contains a list of database records or documents (such as SOPs, documents, calibration instruments, audit plans/schedules, risks, deviations, or MOC records), YOU MUST ALWAYS PRESENT THE RECORD LIST AS A MARKDOWN TABLE (e.g. | Document Title | Document Number | Type | Status | Department |). NEVER format record lists as numbered lists (1., 2., 3.) or bullet points.

**Crucial App-Specific Instructions:**
When users ask how to upload a new document or how to revise an existing document, you MUST guide them using the exact user-interface flow of this DMS application instead of giving generic answers:

1. **How to Upload a New Document**:
   - Navigate to the **Documents** page by clicking "Documents" in the sidebar navigation (or go to \`/documents\`).
   - Click the blue **"Create Document"** button (with the **Plus** icon) at the top-right corner of the page.
   - This opens the **Create Document Modal**. You must fill in the following details:
     - **Document Name / Title**
     - **Document Number** (e.g. for SOP numbering codes)
     - **Document Type** (select from the dropdown: SOP, Policy, Procedure, etc.)
     - **Departments** (select the department scope)
     - **Description**
   - Click the file upload area to select or drag your file.
   - Click the **"Upload"** / **"Create"** button to submit.

2. **How to Revise an Existing Document**:
   - Navigate to the **Documents** page (\`/documents\`).
   - Find your document in the table list and click on its name to open the **Document Detail Page** (e.g., \`/documents/:id\`).
   - In the top-right corner, click on the **"Revise Document"** button (if the document is approved) or **"Upload New Version"** button (if it is a draft or rejected).
   - This opens the **Upload Version Modal**.
   - Upload the new file version, enter your change/revision notes, and click submit.

3. **Link to DMS Pages**:
   Whenever you mention modules or list specific calibration equipment, documents, audit plans, risks, objectives, or MOC records, you MUST include a clean markdown link to the relevant section so the user can easily navigate there:
   - Calibration & Equipment page: [Calibration & Equipment](/calibration-equipment)
   - Documents library page: [Documents](/documents)
   - Risks Management page: [Risks](/risks)
   - SWOT Analysis page: [SWOT Analysis](/context-organization)
   - Quality/Safety/Environmental Objectives: [Objectives](/objectives)
   - Internal Audit planning/schedules: [Audit Plans](/internal-audit/plan)
   - Product Deviations page: [Product Deviations](/product-deviation)
   - Process Deviations page: [Process Deviations](/process-deviation)
   - Management of Change (MOC) page: [MOC Records](/moc)
   - Organization Chart: [Organization Chart](/org-chart)
   
   Example format: "Plunger calibration is overdue. For more details, you can [click here to access the Calibration & Equipment page](/calibration-equipment)."

Current Application Context:
${context || 'No specific page context provided.'}
${localRules ? `\nLocal DMS System Rules & Policies:\n${localRules}\n` : ''}
${kbContext}
${dbContext}

Please respond to the user's message accordingly.`;

        const activeModel = await this.getActiveModel();

        if (activeModel.provider === 'ollama') {
            this.logger.log(`Sending streaming prompt to local model '${activeModel.name}' at ${this.ollamaUrl}...`);
            
            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: activeModel.name,
                    prompt: effectiveMessage,
                    system: systemPrompt,
                    stream: true,
                    keep_alive: '60m',
                    options: {
                        temperature: 0.7,
                        num_ctx: 8192,
                        num_predict: 4096,
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    responseType: 'stream',
                    timeout: 240000,
                    signal
                })
            );

            await new Promise<void>((resolve, reject) => {
                let buffer = '';
                
                response.data.on('data', (chunkBuffer: Buffer) => {
                    if (signal?.aborted) return;
                    buffer += chunkBuffer.toString('utf8');
                    let index;
                    while ((index = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.substring(0, index).trim();
                        buffer = buffer.substring(index + 1);
                        if (line) {
                            try {
                                const parsed = JSON.parse(line);
                                if (parsed.response) {
                                    onChunk(parsed.response);
                                }
                            } catch (err) {}
                        }
                    }
                });

                response.data.on('end', () => {
                    if (signal?.aborted) return resolve();
                    if (buffer.trim()) {
                        try {
                            const parsed = JSON.parse(buffer.trim());
                            if (parsed.response) {
                                onChunk(parsed.response);
                            }
                        } catch (err) {}
                    }
                    resolve();
                });

                response.data.on('error', (err: any) => {
                    reject(err);
                });
            });
        } else {
            const isGemini = activeModel.provider === 'gemini';
            const apiKeyEnv = isGemini ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
            const apiKey = this.configService.get<string>(apiKeyEnv);
            
            if (!apiKey) {
                throw new Error(`API Key for ${activeModel.provider} is not configured in backend .env`);
            }
            
            const url = isGemini 
                ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' 
                : 'https://api.openai.com/v1/chat/completions';
            
            this.logger.log(`Sending streaming prompt to cloud model '${activeModel.name}' via ${activeModel.provider}...`);
            
            const response = await firstValueFrom(
                this.httpService.post(url, {
                    model: activeModel.name,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 4096
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'stream',
                    timeout: 240000,
                    signal
                })
            );

            await new Promise<void>((resolve, reject) => {
                let buffer = '';
                
                response.data.on('data', (chunkBuffer: Buffer) => {
                    if (signal?.aborted) return;
                    buffer += chunkBuffer.toString('utf8');
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            const dataStr = trimmedLine.slice(6).trim();
                            if (dataStr === '[DONE]') continue;
                            try {
                                const parsed = JSON.parse(dataStr);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    onChunk(content);
                                }
                            } catch (err) {}
                        }
                    }
                });

                response.data.on('end', () => {
                    if (signal?.aborted) return resolve();
                    if (buffer.trim()) {
                        const trimmedLine = buffer.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            const dataStr = trimmedLine.slice(6).trim();
                            if (dataStr !== '[DONE]') {
                                try {
                                    const parsed = JSON.parse(dataStr);
                                    const content = parsed.choices?.[0]?.delta?.content;
                                    if (content) {
                                        onChunk(content);
                                    }
                                } catch (err) {}
                            }
                        }
                    }
                    resolve();
                });

                response.data.on('error', (err: any) => {
                    reject(err);
                });
            });
        }
    }

    /**
     * Dynamically recommends SWOT and PESTLE analysis categories using the active model.
     */
    async recommendSwotPestle(text: string): Promise<any> {
        const prompt = `Analyze the following organizational issue description and recommend the SWOT Category, PESTLE Category, general Impact level, and applicable ISO standard(s) (choose from: "ISO 9001" for quality/operations/customers, "ISO 14001" for environmental/resource/waste/emission issues, "ISO 45001" for occupational health/safety/hazard issues).

Issue: "${text}"

Respond ONLY with a valid raw JSON object matching this structure (no markdown code blocks, no other text):
{
  "category": "strength" | "weakness" | "opportunity" | "threat",
  "pestleCategory": "Political" | "Economic" | "Social" | "Technological" | "Legal" | "Environmental" | "NA",
  "impact": "low" | "medium" | "high" | "critical",
  "standards": ["ISO 9001" | "ISO 14001" | "ISO 45001"],
  "explanation": "A very brief 1-sentence explanation of why you made these choices."
}`;

        const systemPrompt = `You are an Integrated Management System (IMS) compliance expert (ISO 9001, ISO 14001, ISO 45001). Your task is to analyze issues and return a raw JSON recommendation. Do not include markdown code block formatting (such as \`\`\`json) in your response, just return the raw JSON object. Ensure the values fit the exact lists specified.`;

        try {
            const textResponse = await this.generateChatCompletionDirect(prompt, systemPrompt, 0.1, 2048);
            const cleanedResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedResponse);
            return parsed;
        } catch (error) {
            this.logger.error('Failed to recommend SWOT/PESTLE via AI:', error);
            return {
                category: 'strength',
                pestleCategory: 'NA',
                impact: 'low',
                explanation: `Fallback recommendation due to error: ${error.message}`
            };
        }
    }

    /**
     * Dynamically drafts risk mitigation actions using the active model.
     */
    async draftRiskMitigation(title: string, standards: string[]): Promise<any> {
        const prompt = `Draft ISO mitigation control, action plan steps, and assess likelihood (1 to 5) and consequence (1 to 5) for the following risk.

Risk description/title: "${title}"
Standards: ${standards.join(', ') || 'ISO 9001'}

Respond ONLY with a valid raw JSON object matching this structure (no markdown code blocks, no other text):
{
  "mitigationControl": "Brief description of the main control/mitigation strategy",
  "actionPlan": "Action steps to implement the control, formatted as a clear bulleted list or paragraph",
  "likelihood": number,
  "consequence": number
}`;

        const systemPrompt = `You are an expert in ISO Risk Assessment. Assess the risk and return a raw JSON object containing mitigation control and action plans. Do not include markdown code block formatting (such as \`\`\`json) in your response, just return the raw JSON object. Likelihood and consequence must be integers from 1 to 5.`;

        try {
            const textResponse = await this.generateChatCompletionDirect(prompt, systemPrompt, 0.3, 2048);
            const cleanedResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedResponse);
            return parsed;
        } catch (error) {
            this.logger.error('Failed to draft risk mitigation via AI:', error);
            return {
                mitigationControl: 'Establish standard operating procedures and monitoring controls.',
                actionPlan: '1. Review current operations.\n2. Document standard operating procedures.\n3. Conduct staff training.\n4. Perform periodic audits.',
                likelihood: 3,
                consequence: 3
            };
        }
    }

    getModelName(): string {
        return this.modelName;
    }
}
