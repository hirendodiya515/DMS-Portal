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
    ) {
        this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
        // Default to gemma4:e4b which is the lightweight 4B variant optimized for consumer/edge devices
        this.modelName = this.configService.get<string>('OLLAMA_MODEL') || 'gemma4:e4b';
    }

    private async getDatabaseContext(message: string): Promise<string> {
        const queryLower = message.toLowerCase();
        const contextParts: string[] = [];
        const today = new Date();

        // Standard system departments for fallback matching
        const systemDepts = ['tempering', 'furnace', 'annealed packing', 'warehouse', 'quality', 'qc', 'hr', 'mr', 'maintenance', 'store', 'production'];
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
                        where: queryWords.map(w => ({ name: ILike(`%${w}%`) })),
                        take: 5
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

                    const monthPlans = await this.planRepo.find({
                        where: monthQueries,
                        take: 15
                    });
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
                        order: { date: 'DESC' },
                        take: 15
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
                        ],
                        take: 5
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
                        order: { nextCalibrationDate: 'ASC' },
                        take: 15
                    });
                    if (overdueEq.length > 0) {
                        eqText += `### Overdue Instruments:\n` +
                            overdueEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Dept: ${e.department}, Next Calib: ${e.nextCalibrationDate ? new Date(e.nextCalibrationDate).toLocaleDateString() : 'N/A'}`).join('\n') + '\n\n';
                    } else {
                        eqText += `### Overdue Instruments:\n- No active instruments are overdue for calibration.\n\n`;
                    }
                }

                // If asking about maintenance
                if (queryLower.includes('maintenance') || queryLower.includes('inactive')) {
                    const maintenanceEq = await this.eqRepo.find({
                        where: { status: In(['maintenance', 'inactive'] as any[]) },
                        take: 15
                    });
                    if (maintenanceEq.length > 0) {
                        eqText += `### Instruments under Maintenance / Inactive:\n` +
                            maintenanceEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Dept: ${e.department}, Status: ${e.status}`).join('\n') + '\n\n';
                    }
                }

                // Filter by department (if no matched equipment details are listed)
                if (matchedDepts.length > 0 && matchedEq.length === 0) {
                    const deptEq = await this.eqRepo.find({
                        where: matchedDepts.map(d => ({ department: ILike(`%${d}%`) })),
                        take: 15
                    });
                    if (deptEq.length > 0) {
                        eqText += `### Instruments in Requested Departments:\n` +
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

                // If filtering by type (SOP, Policy, etc.) and/or department
                const types = ['sop', 'policy', 'procedure', 'manual', 'format', 'work instruction', 'work_instruction', 'record', 'report'];
                const matchedTypes = types.filter(t => queryLower.includes(t));

                if (matchedTypes.length > 0 || matchedDepts.length > 0) {
                    const findOptions: any = { take: 50 };
                    if (matchedTypes.length > 0) {
                        findOptions.where = matchedTypes.map(t => ({ type: ILike(`%${t}%`) }));
                    }
                    let filteredDocs = await this.docRepo.find(findOptions);

                    if (matchedDepts.length > 0) {
                        filteredDocs = filteredDocs.filter(d => 
                            d.departments && d.departments.some(dept => 
                                matchedDepts.some(md => dept.toLowerCase().includes(md.toLowerCase()))
                            )
                        );
                    }

                    const typeHeader = matchedTypes.length > 0 ? `of Type ${matchedTypes.map(t => t.toUpperCase()).join('/')}` : '';
                    const deptHeader = matchedDepts.length > 0 ? `in ${matchedDepts.map(d => d.toUpperCase()).join('/')} Department` : '';
                    const filterHeader = `### Filtered Documents ${typeHeader} ${deptHeader}`.replace(/\s+/g, ' ').trim() + ':';

                    if (filteredDocs.length > 0) {
                        docText += `${filterHeader}\n` +
                            filteredDocs.slice(0, 15).map(d => `- Title: ${d.title}, No: ${d.documentNumber || 'N/A'}, Type: ${d.type}, Status: ${d.status}, Departments: ${d.departments ? d.departments.join(', ') : 'All'}`).join('\n') + '\n\n';
                    } else {
                        docText += `${filterHeader} None found.\n\n`;
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

                // If asking about critical risks, fetch details for top 10
                if (queryLower.includes('critical') || queryLower.includes('high') || queryLower.includes('red') || queryLower.includes('severity')) {
                    const hiraHigh = await this.hiraRepo.find({ where: { maxRiskLevel: In(['high', 'critical'] as any[]) }, take: 10 });
                    const eaaHigh = await this.eaaRepo.find({ where: { maxRiskLevel: In(['high', 'critical'] as any[]) }, take: 10 });
                    if (hiraHigh.length > 0) {
                        riskText += `### High HIRA (Occupational Safety) Risks (Top 10):\n` +
                            hiraHigh.map(r => `- No: ${r.riskNumber}, Activity: ${r.activity}, Task: ${r.task || 'N/A'}, MaxLevel: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n\n';
                    }
                    if (eaaHigh.length > 0) {
                        riskText += `### High EAA (Environmental Aspect) Risks (Top 10):\n` +
                            eaaHigh.map(r => `- No: ${r.riskNumber}, Process: ${r.process}, Area: ${r.area || 'N/A'}, MaxLevel: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n\n';
                    }
                }

                // Dynamic department match for risks
                if (matchedDepts.length > 0) {
                    riskText += `### Filtered Risks for Requested Departments:\n`;
                    for (const dept of matchedDepts) {
                        const deptHira = await this.hiraRepo.find({
                            where: { department: ILike(`%${dept}%`) },
                            take: 10
                        });
                        if (deptHira.length > 0) {
                            riskText += `For HIRA in ${dept.toUpperCase()}:\n` + deptHira.map(r => `- RiskNo: ${r.riskNumber}, Activity: ${r.activity}, Risk: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n';
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
                const nodes = await this.orgRepo.find({ take: 25 }); // Only load first 25 for general overview to save context space

                contextParts.push(
                    `### Organization Chart Metadata:\n` +
                    `- Total Number of Employees Registered in System: ${count}\n\n` +
                    `### List of Organization Members (First 25 employees shown for reference):\n` +
                    (nodes.length > 0 
                        ? nodes.map(n => `- Name: ${n.name}, Designation: ${n.designation || 'N/A'}, Department: ${n.department || 'N/A'}`).join('\n')
                        : '- No employees currently listed.')
                );
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
                        where: matchedDepts.map(d => ({ department: ILike(`%${d}%`) })),
                        take: 15
                    });
                } else {
                    targetObjs = await this.objRepo.find({ take: 15 });
                }

                if (targetObjs.length > 0) {
                    objText += `### Objectives List:\n` +
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
                const swots = await this.swotRepo.find({ take: 30 }); // Fetch first 30 SWOT issues

                if (swots.length > 0) {
                    const strengths = swots.filter(s => s.category === 'strength');
                    const weaknesses = swots.filter(s => s.category === 'weakness');
                    const opportunities = swots.filter(s => s.category === 'opportunity');
                    const threats = swots.filter(s => s.category === 'threat');

                    let swotText = `### SWOT Analysis Summary (Total: ${totalSwots}):\n` +
                        `- Strengths: ${strengths.length}, Weaknesses: ${weaknesses.length}, Opportunities: ${opportunities.length}, Threats: ${threats.length}\n\n`;

                    if (queryLower.includes('threat') || queryLower.includes('impact') || queryLower.includes('context') || queryLower.includes('high')) {
                        swotText += `### SWOT Threats:\n` +
                            threats.map(t => `- Threat: ${t.text}, Impact: ${t.impact.toUpperCase()}, Standards: ${t.standards ? t.standards.join(', ') : 'None'}`).join('\n') + '\n\n';
                    }
                    if (queryLower.includes('opportunity') || queryLower.includes('context')) {
                        swotText += `### SWOT Opportunities:\n` +
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
                        where: matchedParties.map(p => ({ name: ILike(`%${p}%`) })),
                        take: 15
                    });
                } else {
                    ipList = await this.interestedRepo.find({ take: 15 });
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

                // Fetch top 15 deviations based on query
                let targetProd: ProductDeviation[] = [];
                let targetProc: ProcessDeviation[] = [];

                if (matchedDepts.length > 0) {
                    targetProc = await this.procDevRepo.find({
                        where: matchedDepts.map(d => ({ department: ILike(`%${d}%`) })),
                        take: 15
                    });
                } else {
                    targetProd = await this.prodDevRepo.find({ take: 15 });
                    targetProc = await this.procDevRepo.find({ take: 15 });
                }

                if (targetProd.length > 0 && (queryLower.includes('product') || !queryLower.includes('process'))) {
                    devText += `### Product Deviations:\n` +
                        targetProd.map(d => `- Serial: ${d.serialNumber}, Line: ${d.line}, Nature: ${d.natureOfDeviation || 'N/A'}, Status: ${d.status}`).join('\n') + '\n\n';
                }

                if (targetProc.length > 0 && (queryLower.includes('process') || !queryLower.includes('product'))) {
                    devText += `### Process Deviations:\n` +
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
                        where: matchedDepts.map(d => ({ department: ILike(`%${d}%`) })),
                        take: 15
                    });
                } else {
                    targetMocs = await this.mocRepo.find({ take: 15 });
                }

                if (targetMocs.length > 0) {
                    mocText += `### MOC Records List:\n` +
                        targetMocs.map(m => `- MOC No: ${m.mocNo}, Dept: ${m.department}, Product/Process: ${m.productProcess}, Status: ${m.status}, Description: ${m.description}`).join('\n');
                }

                contextParts.push(mocText);
            } catch (e) {
                this.logger.error('Failed to query MOC records for AI context', e.message);
            }
        }

        if (contextParts.length === 0) {
            return '';
        }

        return `\nRetrieved System Database Information:\n${contextParts.join('\n\n')}\n`;
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
    }

    /**
     * Sends a chat prompt to local Gemma 4 model running on Ollama
     * @param message User query
     * @param context Optional system/page context to guide the model
     */
    async chat(message: string, context?: string): Promise<{ response: string; model: string }> {
        const dbContext = await this.getDatabaseContext(message);
        const localRules = this.getLocalRules();
        
        // Optimize RAG limit to prevent prompt context bloat on local CPU
        const queryLower = message.toLowerCase();
        let kbLimit = 3;
        if (queryLower.includes('summary') || queryLower.includes('list') || queryLower.includes('how many') || queryLower.includes('count')) {
            kbLimit = 1;
        }
        
        const kbMatches = await this.kbService.search(message, kbLimit);
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

Be highly professional, structured, and compliant. Cite specific ISO clauses where relevant to reinforce compliance. Always reassure the user that all data is stored 100% locally and processed securely offline on premises.

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

        try {
            this.logger.log(`Sending prompt to local model '${this.modelName}' at ${this.ollamaUrl}...`);
            
            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.modelName,
                    prompt: message,
                    system: systemPrompt,
                    stream: false,
                    keep_alive: '20m',
                    options: {
                        temperature: 0.7,
                        num_ctx: 8192,
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 240000, // 4 minutes timeout for local CPU/GPU LLM generation
                })
            );

            let data = response.data;
            
            // If data is a string (e.g. if Axios did not automatically parse the response), parse it
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    this.logger.error(`Failed to parse Ollama response body as JSON string: ${data}`);
                }
            }

            // If the model was just loaded into memory, Ollama sometimes returns empty response with done_reason: 'load'.
            // In this case, we automatically retry the request since the model is now active in memory.
            if (data && data.done_reason === 'load' && !data.response) {
                this.logger.log(`Model '${this.modelName}' was just loaded into memory (done_reason: 'load'). Retrying request...`);
                const retryResponse = await firstValueFrom(
                    this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                        model: this.modelName,
                        prompt: message,
                        system: systemPrompt,
                        stream: false,
                        keep_alive: '20m',
                        options: {
                            temperature: 0.7,
                            num_ctx: 8192,
                        }
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 240000, // 4 minutes timeout
                    })
                );
                
                let retryData = retryResponse.data;
                if (typeof retryData === 'string') {
                    try {
                        retryData = JSON.parse(retryData);
                    } catch (e) {}
                }
                data = retryData;
            }

            if (data && data.response) {
                return {
                    response: data.response.trim(),
                    model: this.modelName,
                };
            }

            this.logger.error(`Ollama response structure mismatch. Raw data: ${JSON.stringify(response.data)}`);
            throw new Error('Invalid response structure from Ollama');
        } catch (error) {
            this.logger.error(`Error communicating with local AI model (${this.modelName}):`, error.message);
            
            // Check if connection was refused
            if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
                return {
                    response: `⚠️ DMS Copilot is currently offline. Please ensure Ollama is installed and running locally on your system, and that you have pulled the model using \`ollama pull ${this.modelName}\`.`,
                    model: this.modelName,
                };
            }

            return {
                response: `⚠️ Failed to get a response from local AI: ${error.message}`,
                model: this.modelName,
            };
        }
    }

    /**
     * Sends a chat prompt to local Gemma 4 model running on Ollama and streams the response
     * @param message User query
     * @param context Optional system/page context to guide the model
     * @param onChunk Callback function invoked for every generated token chunk
     */
    async chatStream(message: string, context: string, onChunk: (chunk: string) => void): Promise<void> {
        const dbContext = await this.getDatabaseContext(message);
        const localRules = this.getLocalRules();
        const kbMatches = await this.kbService.search(message, 5);
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

Be highly professional, structured, and compliant. Cite specific ISO clauses where relevant to reinforce compliance. Always reassure the user that all data is stored 100% locally and processed securely offline on premises.

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

        try {
            this.logger.log(`Sending streaming prompt to local model '${this.modelName}' at ${this.ollamaUrl}...`);
            
            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.modelName,
                    prompt: message,
                    system: systemPrompt,
                    stream: true,
                    keep_alive: '20m',
                    options: {
                        temperature: 0.7,
                        num_ctx: 8192,
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    responseType: 'stream',
                    timeout: 240000,
                })
            );

            await new Promise<void>((resolve, reject) => {
                let buffer = '';
                
                response.data.on('data', (chunkBuffer: Buffer) => {
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
                            } catch (err) {
                                // Ignore json parse errors for incomplete lines
                            }
                        }
                    }
                });

                response.data.on('end', () => {
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

        } catch (error) {
            this.logger.error(`Error communicating with local AI model (${this.modelName}) in stream:`, error.message);
            throw error;
        }
    }

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
            const resp = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.modelName,
                    prompt: prompt,
                    system: systemPrompt,
                    stream: false,
                    keep_alive: '20m',
                    options: {
                        temperature: 0.1,
                        num_ctx: 2048,
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000,
                })
            );

            let textResponse = resp.data.response || '';
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(textResponse);
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
            const resp = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.modelName,
                    prompt: prompt,
                    system: systemPrompt,
                    stream: false,
                    keep_alive: '20m',
                    options: {
                        temperature: 0.3,
                        num_ctx: 2048,
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000,
                })
            );

            let textResponse = resp.data.response || '';
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(textResponse);
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
