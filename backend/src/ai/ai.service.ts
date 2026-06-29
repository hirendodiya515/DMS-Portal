import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

        // Helper to match user query against a list of dynamic database departments/categories
        const matchDepartment = (depts: string[]): string[] => {
            return depts.filter(d => d && queryLower.includes(d.toLowerCase()));
        };

        // 1. Audit / Participant Check
        if (
            queryLower.includes('audit') || 
            queryLower.includes('schedule') || 
            queryLower.includes('plan') || 
            queryLower.includes('auditor') || 
            queryLower.includes('auditee') ||
            queryLower.includes('participant')
        ) {
            try {
                // Fetch all registered participants (Auditors and Auditees)
                const participants = await this.participantRepo.find();
                const auditors = participants.filter(p => p.type === 'auditor');
                const auditees = participants.filter(p => p.type === 'auditee');

                let auditText = `### Audit System Status:\n` +
                    `- Total Auditors: ${auditors.length}\n` +
                    `- Total Auditees: ${auditees.length}\n\n`;

                // Specific person search in participants
                const matchedParticipants = participants.filter(p => p.name && queryLower.includes(p.name.toLowerCase()));
                if (matchedParticipants.length > 0) {
                    auditText += `### Matched Audit Participants:\n` +
                        matchedParticipants.map(p => `- Name: ${p.name}, Email: ${p.email}, Type: ${p.type.toUpperCase()}, Department: ${p.department || 'N/A'}`).join('\n') + '\n\n';
                }

                // Dynamic department filter
                const uniqueDepts = Array.from(new Set(participants.map(p => p.department).filter((d): d is string => !!d && d.trim() !== '')));
                const matchedDepts = matchDepartment(uniqueDepts);
                if (matchedDepts.length > 0) {
                    auditText += `### Registered Auditees for Requested Departments:\n`;
                    for (const dept of matchedDepts) {
                        const deptAuditees = auditees.filter(a => a.department && a.department.toLowerCase() === dept.toLowerCase());
                        if (deptAuditees.length > 0) {
                            auditText += `- ${dept.toUpperCase()}: ` + deptAuditees.map(a => `${a.name} (${a.email})`).join(', ') + '\n';
                        } else {
                            auditText += `- ${dept.toUpperCase()}: No registered auditees.\n`;
                        }
                    }
                    auditText += '\n';
                }

                // Month checks (e.g. "Planned in June")
                const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                const matchedMonths = months.filter(m => queryLower.includes(m));
                
                // Fetch audit schedules & plans
                const schedules = await this.schedRepo.find({ relations: ['auditors'] });
                const plans = await this.planRepo.find();

                if (matchedMonths.length > 0) {
                    auditText += `### Audit Plans for Requested Months:\n`;
                    for (const m of matchedMonths) {
                        const monthPlans = plans.filter(p => p.month && p.month.toLowerCase().includes(m));
                        if (monthPlans.length > 0) {
                            auditText += monthPlans.map(p => `- Dept: ${p.department}, Month: ${p.month}, Status: ${p.isPlanned ? 'Planned' : 'Unplanned'}, Outcome: ${p.outcome || 'Pending'}`).join('\n') + '\n';
                        }
                    }
                    auditText += '\n';
                }

                // General Audit schedules summary
                if (schedules.length > 0) {
                    const upcoming = schedules.filter(s => new Date(s.date) >= today);
                    const completed = schedules.filter(s => s.status as string === 'completed');
                    auditText += `### Audit Schedule Summary:\n` +
                        `- Total Audits Scheduled: ${schedules.length}\n` +
                        `- Completed Audits: ${completed.length}\n` +
                        `- Upcoming Audits: ${upcoming.length}\n\n`;

                    if (queryLower.includes('schedule') || queryLower.includes('upcoming') || matchedDepts.length > 0) {
                        const targetSchedules = matchedDepts.length > 0 
                            ? schedules.filter(s => matchedDepts.some(d => s.department && s.department.toLowerCase().includes(d.toLowerCase())))
                            : schedules.slice(0, 15);
                        
                        if (targetSchedules.length > 0) {
                            auditText += `### Detailed Audit Schedules:\n` +
                                targetSchedules.map(s => `- Dept: ${s.department}, Date: ${new Date(s.date).toLocaleDateString()}, Scope: ${s.scope}, Status: ${s.status}, Auditors: ${s.auditors && s.auditors.length > 0 ? s.auditors.map(a => a.name).join(', ') : 'None'}`).join('\n') + '\n\n';
                        }
                    }
                }

                contextParts.push(auditText);
            } catch (e) {
                this.logger.error('Failed to query audits or participants for AI context', e.message);
            }
        }

        // 2. Equipment & Calibration check
        if (queryLower.includes('calibrat') || queryLower.includes('equipment') || queryLower.includes('instrument') || queryLower.includes('measurement') || queryLower.includes('maintenance')) {
            try {
                const allEq = await this.eqRepo.find();
                const activeEq = allEq.filter(e => e.status as string === 'Active');
                const maintenanceEq = allEq.filter(e => e.status as string === 'Maintenance' || e.status as string === 'Inactive');
                const overdueEq = allEq.filter(e => e.nextCalibrationDate && new Date(e.nextCalibrationDate) < today && e.status as string !== 'Maintenance' && e.status as string !== 'Inactive');

                let eqText = `### Calibration & Equipment Summary:\n` +
                    `- Total Instruments: ${allEq.length}\n` +
                    `- Active Instruments: ${activeEq.length}\n` +
                    `- Under Maintenance / Inactive: ${maintenanceEq.length}\n` +
                    `- Overdue for Calibration: ${overdueEq.length}\n\n`;

                // Specific equipment match by number or name (e.g. "E-101" or "Vernier")
                const matchedEq = allEq.filter(e => 
                    (e.equipmentNumber && queryLower.includes(e.equipmentNumber.toLowerCase())) ||
                    (e.name && queryLower.includes(e.name.toLowerCase()))
                );
                if (matchedEq.length > 0) {
                    eqText += `### Matched Instruments:\n` +
                        matchedEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Location: ${e.location || 'N/A'}, Dept: ${e.department}, Status: ${e.status}, Next Calib: ${e.nextCalibrationDate ? new Date(e.nextCalibrationDate).toLocaleDateString() : 'N/A'}`).join('\n') + '\n\n';
                }

                // If asking about overdue
                if (queryLower.includes('overdue') || queryLower.includes('due') || queryLower.includes('pending')) {
                    if (overdueEq.length > 0) {
                        eqText += `### Overdue Instruments:\n` +
                            overdueEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Dept: ${e.department}, Next Calib: ${e.nextCalibrationDate ? new Date(e.nextCalibrationDate).toLocaleDateString() : 'N/A'}`).join('\n') + '\n\n';
                    } else {
                        eqText += `### Overdue Instruments:\n- No active instruments are overdue for calibration.\n\n`;
                    }
                }

                // If asking about maintenance
                if (queryLower.includes('maintenance') || queryLower.includes('inactive')) {
                    if (maintenanceEq.length > 0) {
                        eqText += `### Instruments under Maintenance / Inactive:\n` +
                            maintenanceEq.map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Dept: ${e.department}, Status: ${e.status}`).join('\n') + '\n\n';
                    }
                }

                // Filter by department
                const uniqueDepts = Array.from(new Set(allEq.map(e => e.department).filter((d): d is string => !!d && d.trim() !== '')));
                const matchedDepts = matchDepartment(uniqueDepts);
                if (matchedDepts.length > 0 && matchedEq.length === 0) {
                    eqText += `### Instruments in Requested Departments:\n`;
                    for (const dept of matchedDepts) {
                        const deptEq = allEq.filter(e => e.department && e.department.toLowerCase() === dept.toLowerCase());
                        if (deptEq.length > 0) {
                            eqText += `For ${dept.toUpperCase()}:\n` + deptEq.slice(0, 10).map(e => `- No: ${e.equipmentNumber}, Name: ${e.name}, Status: ${e.status}`).join('\n') + '\n';
                        }
                    }
                }

                contextParts.push(eqText);
            } catch (e) {
                this.logger.error('Failed to query equipment for AI context', e.message);
            }
        }

        // 3. Document check
        if (queryLower.includes('document') || queryLower.includes('sop') || queryLower.includes('policy') || queryLower.includes('procedure') || queryLower.includes('manual') || queryLower.includes('format')) {
            try {
                const allDocs = await this.docRepo.find();
                const approved = allDocs.filter(d => d.status === 'approved' as any);
                const draft = allDocs.filter(d => d.status === 'draft' as any);
                const review = allDocs.filter(d => d.status === 'review' as any || d.status === 'under review' as any);

                let docText = `### Document Management System Summary:\n` +
                    `- Total Documents: ${allDocs.length}\n` +
                    `- Approved Documents: ${approved.length}\n` +
                    `- Draft Documents: ${draft.length}\n` +
                    `- Under Review Documents: ${review.length}\n\n`;

                // Specific document search by title or number (supporting substring search in both directions)
                const matchedDocs = allDocs.filter(d => 
                    (d.documentNumber && (queryLower.includes(d.documentNumber.toLowerCase()) || d.documentNumber.toLowerCase().includes(queryLower))) ||
                    (d.title && (queryLower.includes(d.title.toLowerCase()) || d.title.toLowerCase().includes(queryLower)))
                );
                if (matchedDocs.length > 0) {
                    docText += `### Matched Documents:\n` +
                        matchedDocs.map(d => `- Title: ${d.title}, Number: ${d.documentNumber || 'N/A'}, Type: ${d.type}, Status: ${(d.status as string).toUpperCase()}, Departments: ${d.departments ? d.departments.join(', ') : 'All'}`).join('\n') + '\n\n';
                }

                // If filtering by type (SOP, Policy, etc.) and/or department
                const types = ['sop', 'policy', 'procedure', 'manual', 'format', 'work instruction', 'work_instruction', 'record', 'report'];
                const matchedTypes = types.filter(t => queryLower.includes(t));

                const uniqueDepts = Array.from(new Set(allDocs.flatMap(d => d.departments || []).filter(d => !!d && d.trim() !== '')));
                let allSystemDepts = uniqueDepts;
                try {
                    const orgNodes = await this.orgRepo.find({ select: ['department'] });
                    const orgDepts = orgNodes.map(n => n.department).filter((d): d is string => !!d && d.trim() !== '');
                    allSystemDepts = Array.from(new Set([...uniqueDepts, ...orgDepts]));
                } catch (err) {
                    this.logger.error('Failed to query organization chart departments for document matching', err.message);
                }

                const matchedDepts = matchDepartment(allSystemDepts);

                if (matchedTypes.length > 0 || matchedDepts.length > 0) {
                    let filteredDocs = allDocs;

                    if (matchedTypes.length > 0) {
                        filteredDocs = filteredDocs.filter(d => 
                            d.type && matchedTypes.some(mt => d.type.toLowerCase().includes(mt))
                        );
                    }

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
            queryLower.includes('furnace') ||
            queryLower.includes('threat') ||
            queryLower.includes('severity')
        ) {
            try {
                const hiraRisks = await this.hiraRepo.find();
                const eaaRisks = await this.eaaRepo.find();
                const qraRisks = await this.qraRepo.find();

                const hiraHigh = hiraRisks.filter(r => r.maxRiskLevel === 'high' || r.maxRiskLevel === 'critical');
                const eaaHigh = eaaRisks.filter(r => r.maxRiskLevel === 'high' || r.maxRiskLevel === 'critical');
                const qraHigh = qraRisks.filter(r => r.maxRiskLevel === 'high' || r.maxRiskLevel === 'critical');

                let riskText = `### Hazard & Risk Assessment Summary:\n` +
                    `- HIRA (Occupational Safety): Total: ${hiraRisks.length}, Critical/High ("Red" Risks): ${hiraHigh.length}\n` +
                    `- EAA (Environmental Aspects): Total: ${eaaRisks.length}, Critical/High ("Red" Risks): ${eaaHigh.length}\n` +
                    `- QRA (Quantitative Risk): Total: ${qraRisks.length}, Critical/High ("Red" Risks): ${qraHigh.length}\n\n`;

                // If asking about high/red/critical risks
                if (queryLower.includes('high') || queryLower.includes('critical') || queryLower.includes('red')) {
                    if (hiraHigh.length > 0) {
                        riskText += `### High/Critical HIRA Risks:\n` +
                            hiraHigh.slice(0, 10).map(r => `- No: ${r.riskNumber}, Activity: ${r.activity}, Task: ${r.task || 'N/A'}, Dept: ${r.department}, RiskLevel: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n\n';
                    }
                    if (eaaHigh.length > 0) {
                        riskText += `### High/Critical EAA Risks:\n` +
                            eaaHigh.slice(0, 10).map(r => `- No: ${r.riskNumber}, Process: ${r.process}, Area: ${r.area || 'N/A'}, MaxLevel: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n\n';
                    }
                }

                // Dynamic department match for risks (e.g. "Risks in Furnace")
                const allHiraDepts = Array.from(new Set(hiraRisks.map(r => r.department).filter((d): d is string => !!d && d.trim() !== '')));
                const matchedDepts = matchDepartment(allHiraDepts);
                if (matchedDepts.length > 0) {
                    riskText += `### Filtered Risks for Requested Departments:\n`;
                    for (const dept of matchedDepts) {
                        const deptHira = hiraRisks.filter(r => r.department && r.department.toLowerCase() === dept.toLowerCase());
                        if (deptHira.length > 0) {
                            riskText += `For HIRA in ${dept.toUpperCase()}:\n` + deptHira.slice(0, 10).map(r => `- RiskNo: ${r.riskNumber}, Activity: ${r.activity}, Risk: ${r.maxRiskLevel.toUpperCase()}`).join('\n') + '\n';
                        }
                    }
                }

                contextParts.push(riskText);
            } catch (e) {
                this.logger.error('Failed to query risks for AI context', e.message);
            }
        }

        // 5. Org Chart check
        if (queryLower.includes('org') || queryLower.includes('chart') || queryLower.includes('people') || queryLower.includes('employee') || queryLower.includes('hierarchy') || queryLower.includes('designation')) {
            try {
                const count = await this.orgRepo.count();
                const nodes = await this.orgRepo.find({
                    take: 50,
                });
                contextParts.push(
                    `### Organization Chart Metadata:\n` +
                    `- Total Number of Employees Registered in System: ${count}\n\n` +
                    `### List of Organization Members (First 50 employees shown for reference):\n` +
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
            const allNodes = await this.orgRepo.find({ select: ['id', 'parentId', 'name', 'designation', 'department'] });
            
            // Build ID to Name map for manager lookup
            const idToNameMap = new Map<string, string>();
            allNodes.forEach(n => idToNameMap.set(n.id, n.name));

            const matchedNodes = allNodes.filter(n => {
                if (!n.name) return false;
                const lowerName = n.name.toLowerCase();
                const lowerDesig = n.designation ? n.designation.toLowerCase() : '';
                
                // Match full name
                if (queryLower.includes(lowerName)) return true;

                // Match specific designations
                if (lowerDesig && (
                    queryLower.includes(lowerDesig) || 
                    (lowerDesig === 'ceo' && queryLower.includes('ceo')) ||
                    (lowerDesig === 'cfo' && queryLower.includes('cfo'))
                )) return true;

                // Match split name parts
                const nameParts = lowerName.split(/\s+/).filter(part => part.length > 2);
                if (nameParts.length >= 2) {
                    const matches = nameParts.filter(part => queryLower.includes(part)).length;
                    return matches >= 2;
                }
                return false;
            });

            if (matchedNodes.length > 0) {
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
                const objectives = await this.objRepo.find();
                
                let objText = `### Objectives & Targets Summary:\n` +
                    `- Total Objectives: ${objectives.length}\n` +
                    `- Active Objectives: ${objectives.filter(o => o.status as string === 'Active' || o.status as string === 'In Progress').length}\n` +
                    `- Achieved Objectives: ${objectives.filter(o => o.status as string === 'Achieved').length}\n\n`;

                // If asking about a specific department's objectives
                const uniqueDepts = Array.from(new Set(objectives.map(o => o.department).filter((d): d is string => !!d && d.trim() !== '')));
                const matchedDepts = matchDepartment(uniqueDepts);
                
                const targetObjs = matchedDepts.length > 0
                    ? objectives.filter(o => matchedDepts.some(d => o.department && o.department.toLowerCase().includes(d.toLowerCase())))
                    : objectives.slice(0, 15);

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
                const swots = await this.swotRepo.find();
                if (swots.length > 0) {
                    const strengths = swots.filter(s => s.category === 'strength');
                    const weaknesses = swots.filter(s => s.category === 'weakness');
                    const opportunities = swots.filter(s => s.category === 'opportunity');
                    const threats = swots.filter(s => s.category === 'threat');

                    let swotText = `### SWOT Analysis Summary (Total: ${swots.length}):\n` +
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

        // 8. Interested Parties (Needs & Expectations of Employees, Customers, etc.)
        if (
            queryLower.includes('need') || 
            queryLower.includes('expectation') || 
            queryLower.includes('interested') || 
            queryLower.includes('party') || 
            queryLower.includes('parties') || 
            queryLower.includes('employee') ||
            queryLower.includes('customer') ||
            queryLower.includes('expect')
        ) {
            try {
                const ipList = await this.interestedRepo.find();
                if (ipList.length > 0) {
                    // Filter matching specific interested parties in query (e.g. "employees" or "customers")
                    const matchedIps = ipList.filter(ip => 
                        queryLower.includes(ip.name.toLowerCase()) || 
                        (ip.name.toLowerCase().includes('employee') && queryLower.includes('employee')) ||
                        (ip.name.toLowerCase().includes('customer') && queryLower.includes('customer'))
                    );

                    const targetIps = matchedIps.length > 0 ? matchedIps : ipList;

                    contextParts.push(
                        `### Interested Parties (Needs & Expectations):\n` +
                        targetIps.map(ip => `- Party Name: ${ip.name}\n  Needs & Expectations: ${ip.needs}\n  Risk Rating: ${ip.risk}\n  Actions: ${ip.actions && ip.actions.length > 0 ? ip.actions.join(', ') : 'None'}\n  Responsible: ${ip.responsible || 'N/A'}`).join('\n\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query Interested Parties for AI context', e.message);
            }
        }

        // 9. Deviation check
        if (queryLower.includes('deviation') || queryLower.includes('non-conformance') || queryLower.includes('defect') || queryLower.includes('reject') || queryLower.includes('nonconformance')) {
            try {
                const prodDevs = await this.prodDevRepo.find();
                const procDevs = await this.procDevRepo.find();

                let devText = `### Product & Process Deviations Summary:\n` +
                    `- Total Product Deviations: ${prodDevs.length}\n` +
                    `- Total Process Deviations: ${procDevs.length}\n\n`;

                // If asking about a specific department's process deviations
                const uniqueDepts = Array.from(new Set(procDevs.map(d => d.department).filter((d): d is string => !!d && d.trim() !== '')));
                const matchedDepts = matchDepartment(uniqueDepts);

                const targetProd = prodDevs.slice(0, 10);
                const targetProc = matchedDepts.length > 0
                    ? procDevs.filter(d => matchedDepts.some(dept => d.department && d.department.toLowerCase().includes(dept.toLowerCase())))
                    : procDevs.slice(0, 10);

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
                const mocs = await this.mocRepo.find();
                
                let mocText = `### Management of Change (MOC) Summary:\n` +
                    `- Total MOC Records: ${mocs.length}\n` +
                    `- Active/Under Review MOCs: ${mocs.filter(m => m.status !== 'Approved' && m.status !== 'Finalized').length}\n` +
                    `- Approved/Finalized MOCs: ${mocs.filter(m => m.status === 'Approved' || m.status === 'Finalized').length}\n\n`;

                const uniqueDepts = Array.from(new Set(mocs.map(m => m.department).filter((d): d is string => !!d && d.trim() !== '')));
                const matchedDepts = matchDepartment(uniqueDepts);

                const targetMocs = matchedDepts.length > 0
                    ? mocs.filter(m => matchedDepts.some(d => m.department && m.department.toLowerCase().includes(d.toLowerCase())))
                    : mocs.slice(0, 15);

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

    getModelName(): string {
        return this.modelName;
    }
}
