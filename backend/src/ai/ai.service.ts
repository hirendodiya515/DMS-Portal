import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
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

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly ollamaUrl: string;
    private readonly modelName: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
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
    ) {
        this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
        // Default to gemma4:e4b which is the lightweight 4B variant optimized for consumer/edge devices
        this.modelName = this.configService.get<string>('OLLAMA_MODEL') || 'gemma4:e4b';
    }

    private async getDatabaseContext(message: string): Promise<string> {
        const queryLower = message.toLowerCase();
        const contextParts: string[] = [];

        // 1. Audit check
        if (queryLower.includes('audit') || queryLower.includes('schedule') || queryLower.includes('plan')) {
            try {
                // Fetch top 10 audit schedules
                const schedules = await this.schedRepo.find({
                    order: { date: 'ASC' },
                    take: 10,
                });
                if (schedules.length > 0) {
                    contextParts.push('### Upcoming & Past Audit Schedules:\n' + 
                        schedules.map(s => `- Department: ${s.department}, Date: ${new Date(s.date).toLocaleDateString()}, Scope: ${s.scope}, Status: ${s.status}`).join('\n')
                    );
                }

                // Fetch top 10 audit plans
                const plans = await this.planRepo.find({
                    take: 10,
                });
                if (plans.length > 0) {
                    contextParts.push('### Month-wise Audit Plans:\n' +
                        plans.map(p => `- Department: ${p.department}, Month: ${p.month}, Status: ${p.isPlanned ? 'Planned' : 'Unplanned'}, Outcome: ${p.outcome || 'Pending'}`).join('\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query audits for AI context', e.message);
            }
        }

        // 2. Equipment & Calibration check
        if (queryLower.includes('calibrat') || queryLower.includes('equipment') || queryLower.includes('instrument') || queryLower.includes('maintenance')) {
            try {
                // Fetch top 10 equipment
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
                // Fetch top 10 documents
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

        // 4. Risk check
        if (queryLower.includes('risk') || queryLower.includes('hira') || queryLower.includes('hazard')) {
            try {
                // Fetch top 10 risks
                const risks = await this.riskRepo.find({
                    take: 10,
                });
                if (risks.length > 0) {
                    contextParts.push('### System Risks & Hazard Assessments:\n' +
                        risks.map(r => `- Number: ${r.riskNumber}, Title: ${r.title}, Type: ${r.type}`).join('\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query risks for AI context', e.message);
            }
        }

        // 5. Org Chart check
        if (queryLower.includes('org') || queryLower.includes('chart') || queryLower.includes('people') || queryLower.includes('employee') || queryLower.includes('hierarchy') || queryLower.includes('designation')) {
            try {
                const count = await this.orgRepo.count();
                const nodes = await this.orgRepo.find({
                    take: 25,
                });
                if (nodes.length > 0) {
                    contextParts.push(`### Organization Chart (Total People: ${count}):\n` +
                        nodes.map(n => `- Name: ${n.name}, Designation: ${n.designation || 'N/A'}, Department: ${n.department || 'N/A'}`).join('\n')
                    );
                } else {
                    contextParts.push(`### Organization Chart:\n- No people are currently listed in the organization chart.`);
                }
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
        if (queryLower.includes('swot') || queryLower.includes('strength') || queryLower.includes('weakness') || queryLower.includes('opportunity') || queryLower.includes('threat')) {
            try {
                const swots = await this.swotRepo.find({
                    take: 15,
                });
                if (swots.length > 0) {
                    contextParts.push('### SWOT Analysis (Context of Organization):\n' +
                        swots.map(s => `- Category: ${s.category.toUpperCase()}, Text: ${s.text}, Impact: ${s.impact.toUpperCase()}, Standards: ${s.standards ? s.standards.join(', ') : 'None'}`).join('\n')
                    );
                }
            } catch (e) {
                this.logger.error('Failed to query SWOT issues for AI context', e.message);
            }
        }

        // 8. Deviation check
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

        // 9. MOC check
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

    /**
     * Sends a chat prompt to local Gemma 4 model running on Ollama
     * @param message User query
     * @param context Optional system/page context to guide the model
     */
    async chat(message: string, context?: string): Promise<{ response: string; model: string }> {
        const dbContext = await this.getDatabaseContext(message);

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

Current Application Context:
${context || 'No specific page context provided.'}
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
                        num_ctx: 2048,
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
                            num_ctx: 2048,
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
}
