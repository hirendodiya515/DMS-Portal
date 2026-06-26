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

        // 1. Audit / Participant Check
        if (
            queryLower.includes('audit') || 
            queryLower.includes('schedule') || 
            queryLower.includes('plan') || 
            queryLower.includes('auditor') || 
            queryLower.includes('auditee')
        ) {
            try {
                // Fetch all registered participants (Auditors and Auditees)
                const participants = await this.participantRepo.find();
                const auditors = participants.filter(p => p.type === 'auditor');
                const auditees = participants.filter(p => p.type === 'auditee');

                let auditText = `### Registered Auditors (Total: ${auditors.length}):\n` +
                    auditors.map(a => `- Name: ${a.name}, Email: ${a.email}, Remarks: ${a.remarks || 'None'}, Certificate: ${a.certificateName || 'N/A'}`).join('\n') + '\n\n' +
                    `### Registered Auditees (Total: ${auditees.length}):\n` +
                    auditees.map(a => `- Name: ${a.name}, Email: ${a.email}, Department: ${a.department || 'N/A'}`).join('\n');

                // Filter auditees matching any specific department in query dynamically
                const allDepts = Array.from(new Set(
                    participants
                        .map(p => p.department)
                        .filter((dept): dept is string => !!dept && dept.trim() !== '')
                ));
                const matchedDepts = allDepts.filter(dept => 
                    queryLower.includes(dept.toLowerCase())
                );
                if (matchedDepts.length > 0) {
                    auditText += `\n\n### Filtered Auditees Matching Query:`;
                    for (const dept of matchedDepts) {
                        const filtered = auditees.filter(a => a.department && a.department.toLowerCase() === dept.toLowerCase());
                        if (filtered.length > 0) {
                            auditText += `\nFor department "${dept}":\n` + filtered.map(a => `- Name: ${a.name}, Email: ${a.email}, Department: ${a.department}`).join('\n');
                        } else {
                            auditText += `\nFor department "${dept}": No specific auditees registered.`;
                        }
                    }
                }

                // Fetch top 15 audit schedules
                const schedules = await this.schedRepo.find({
                    relations: ['auditors'],
                    order: { date: 'ASC' },
                    take: 15,
                });
                if (schedules.length > 0) {
                    auditText += '\n\n### Upcoming & Past Audit Schedules:\n' + 
                        schedules.map(s => `- Department: ${s.department}, Date: ${new Date(s.date).toLocaleDateString()}, Scope: ${s.scope}, Status: ${s.status}, Assigned Auditors: ${s.auditors && s.auditors.length > 0 ? s.auditors.map(a => a.name).join(', ') : 'None'}`).join('\n');
                }

                // Fetch top 10 audit plans
                const plans = await this.planRepo.find({
                    take: 10,
                });
                if (plans.length > 0) {
                    auditText += '\n\n### Month-wise Audit Plans:\n' +
                        plans.map(p => `- Department: ${p.department}, Month: ${p.month}, Status: ${p.isPlanned ? 'Planned' : 'Unplanned'}, Outcome: ${p.outcome || 'Pending'}`).join('\n');
                }

                contextParts.push(auditText);
            } catch (e) {
                this.logger.error('Failed to query audits or participants for AI context', e.message);
            }
        }

        // 2. Equipment & Calibration check
        if (queryLower.includes('calibrat') || queryLower.includes('equipment') || queryLower.includes('instrument') || queryLower.includes('maintenance')) {
            try {
                const equipment = await this.eqRepo.find({
                    order: { nextCalibrationDate: 'ASC' },
                    take: 10,
                });
                if (equipment.length > 0) {
                    contextParts.push('### Equipment & Calibration Schedule:\n' +
                        equipment.map(e => `- Number: ${e.equipmentNumber}, Name: ${e.name}, Location: ${e.location}, Dept: ${e.department}, Status: ${e.status}, Next Calibration: ${e.nextCalibrationDate ? new Date(e.nextCalibrationDate).toLocaleDateString() : 'N/A'}`).join('\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query equipment for AI context', e.message);
            }
        }

        // 3. Document check
        if (queryLower.includes('document') || queryLower.includes('sop') || queryLower.includes('policy') || queryLower.includes('procedure')) {
            try {
                const docs = await this.docRepo.find({
                    order: { updatedAt: 'DESC' },
                    take: 10,
                });
                if (docs.length > 0) {
                    contextParts.push('### Recent System Documents:\n' +
                        docs.map(d => `- Title: ${d.title}, Number: ${d.documentNumber || 'N/A'}, Type: ${d.type}, Status: ${d.status}`).join('\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query documents for AI context', e.message);
            }
        }

        // 4. Risks & Severity Rating (HIRA / EAA / QRA / Furnace)
        if (
            queryLower.includes('risk') || 
            queryLower.includes('hira') || 
            queryLower.includes('hazard') || 
            queryLower.includes('eaa') || 
            queryLower.includes('qra') || 
            queryLower.includes('furnace') ||
            queryLower.includes('threat')
        ) {
            try {
                // Fetch general risks
                const risks = await this.riskRepo.find({ take: 10 });
                let riskText = '';
                if (risks.length > 0) {
                    riskText += '### System Risks & Hazard Assessments:\n' +
                        risks.map(r => `- Number: ${r.riskNumber}, Title: ${r.title}, Type: ${r.type}`).join('\n') + '\n\n';
                }

                // Fetch HIRA risks
                const hiraRisks = await this.hiraRepo.find({ take: 50 });
                const hiraHigh = hiraRisks.filter(r => r.maxRiskLevel === 'high' || r.maxRiskLevel === 'critical').length;
                const hiraMed = hiraRisks.filter(r => r.maxRiskLevel === 'medium').length;
                const hiraLow = hiraRisks.filter(r => r.maxRiskLevel === 'low').length;

                riskText += `### HIRA (Occupational Safety) Risks Summary:\n` +
                    `- Total Registered HIRA Risks: ${hiraRisks.length}\n` +
                    `- Critical/High ("Red" Risks): ${hiraHigh}\n` +
                    `- Medium (Amber Risks): ${hiraMed}\n` +
                    `- Low (Green Risks): ${hiraLow}\n`;

                // Fetch EAA risks
                const eaaRisks = await this.eaaRepo.find({ take: 20 });
                riskText += `\n### EAA (Environmental Aspects) Risks (Total: ${eaaRisks.length}):\n` +
                    eaaRisks.slice(0, 10).map(r => `- Number: ${r.riskNumber}, Process: ${r.process}, Area: ${r.area || 'N/A'}, Max Level: ${r.maxRiskLevel}`).join('\n');

                // Filter HIRA/EAA/QRA risks matching specific keywords (e.g. "furnace" or "tempering")
                const kwList = ['furnace', 'tempering', 'cutting', 'packing', 'electrical', 'chemical', 'lifting'];
                const matchedKws = kwList.filter(k => queryLower.includes(k));
                if (matchedKws.length > 0) {
                    riskText += `\n\n### Filtered HIRA Risks Matching Query:`;
                    for (const kw of matchedKws) {
                        const matches = hiraRisks.filter(r => 
                            (r.department && r.department.toLowerCase().includes(kw)) ||
                            (r.activity && r.activity.toLowerCase().includes(kw)) ||
                            (r.task && r.task.toLowerCase().includes(kw))
                        );
                        if (matches.length > 0) {
                            riskText += `\nFor keyword "${kw}":\n` + 
                                matches.map(m => `- RiskNo: ${m.riskNumber}, Activity: ${m.activity}, Task: ${m.task || 'N/A'}, Dept: ${m.department}, RiskLevel: ${m.maxRiskLevel.toUpperCase()}`).join('\n');
                        } else {
                            riskText += `\nFor keyword "${kw}": No HIRA risks registered.`;
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

        // 6. Objectives/KPIs check
        if (queryLower.includes('objective') || queryLower.includes('kpi') || queryLower.includes('target') || queryLower.includes('goal')) {
            try {
                const objectives = await this.objRepo.find({
                    take: 10,
                });
                if (objectives.length > 0) {
                    contextParts.push('### Quality, Environmental & Safety Objectives:\n' +
                        objectives.map(o => `- Number: ${o.objectiveNumber}, Name: ${o.name}, Type: ${o.type}, Dept: ${o.department || 'N/A'}, Target: ${o.target} ${o.uom}, Status: ${o.status}`).join('\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query objectives for AI context', e.message);
            }
        }

        // 7. SWOT check
        if (queryLower.includes('swot') || queryLower.includes('strength') || queryLower.includes('weakness') || queryLower.includes('opportunity') || queryLower.includes('threat') || queryLower.includes('context')) {
            try {
                const swots = await this.swotRepo.find({
                    take: 40,
                });
                if (swots.length > 0) {
                    const strengths = swots.filter(s => s.category === 'strength');
                    const weaknesses = swots.filter(s => s.category === 'weakness');
                    const opportunities = swots.filter(s => s.category === 'opportunity');
                    const threats = swots.filter(s => s.category === 'threat');

                    let swotText = `### SWOT Analysis Summary (Total: ${swots.length}):\n` +
                        `- Strengths: ${strengths.length}, Weaknesses: ${weaknesses.length}, Opportunities: ${opportunities.length}, Threats: ${threats.length}\n\n`;

                    if (queryLower.includes('threat') || queryLower.includes('impact') || queryLower.includes('context')) {
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
            queryLower.includes('employee')
        ) {
            try {
                const ipList = await this.interestedRepo.find({ take: 30 });
                if (ipList.length > 0) {
                    contextParts.push(
                        `### Interested Parties (Needs & Expectations):\n` +
                        ipList.map(ip => `- Party Name: ${ip.name}\n  Needs: ${ip.needs}\n  Risk Rating: ${ip.risk}\n  Actions: ${ip.actions && ip.actions.length > 0 ? ip.actions.join(', ') : 'None'}\n  Responsible: ${ip.responsible || 'N/A'}`).join('\n\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query Interested Parties for AI context', e.message);
            }
        }

        // 9. Deviation check
        if (queryLower.includes('deviation') || queryLower.includes('non-conformance') || queryLower.includes('defect') || queryLower.includes('reject')) {
            try {
                const prodDevs = await this.prodDevRepo.find({
                    take: 5,
                });
                if (prodDevs.length > 0) {
                    contextParts.push('### Product Deviations:\n' +
                        prodDevs.map(d => `- Serial: ${d.serialNumber}, Line: ${d.line}, Nature: ${d.natureOfDeviation || 'N/A'}, Status: ${d.status}`).join('\n')
                    );
                }

                const procDevs = await this.procDevRepo.find({
                    take: 5,
                });
                if (procDevs.length > 0) {
                    contextParts.push('### Process Deviations:\n' +
                        procDevs.map(d => `- Serial: ${d.serialNumber}, Line: ${d.line}, Dept: ${d.department}, Nature: ${d.natureOfDeviation || 'N/A'}, Status: ${d.status}`).join('\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query deviations for AI context', e.message);
            }
        }

        // 10. MOC check
        if (queryLower.includes('moc') || queryLower.includes('change') || queryLower.includes('management of change')) {
            try {
                const mocs = await this.mocRepo.find({
                    take: 10,
                });
                if (mocs.length > 0) {
                    contextParts.push('### MOC Records (Management of Change):\n' +
                        mocs.map(m => `- MOC No: ${m.mocNo}, Dept: ${m.department}, Product/Process: ${m.productProcess}, Description: ${m.description}, Status: ${m.status}`).join('\n')
                    );
                }
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
