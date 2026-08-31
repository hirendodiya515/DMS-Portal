import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { AuditExecution } from '../entities/audit-execution.entity';
import { AuditSchedule } from '../entities/audit-schedule.entity';
import { Equipment } from '../entities/equipment.entity';
import { Document } from '../entities/document.entity';
import { HiraRisk } from '../entities/hira-risk.entity';
import { EaaRisk } from '../entities/eaa-risk.entity';

export interface PreAuditBriefingResponse {
  department: string;
  scheduleId?: string;
  scope?: string;
  plannedDate?: string;
  riskScore: number; // 0 to 100
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  repeatNCs: {
    theme: string;
    count: number;
    lastClauses: string[];
    description: string;
  }[];
  overdueEquipment: {
    equipmentNumber: string;
    name: string;
    nextCalibrationDate: string;
    status: string;
  }[];
  recentDocRevisions: {
    documentNumber: string;
    title: string;
    type: string;
    updatedAt: string;
  }[];
  highRisks: {
    type: 'HIRA' | 'EAA';
    riskNumber: string;
    description: string;
    riskLevel: string;
  }[];
  recommendedChecklist: {
    id: number;
    isoStandard: 'ISO 9001:2015' | 'ISO 14001:2015' | 'ISO 45001:2018';
    clauseNumber: string;
    clauseTitle: string;
    auditQuestion: string;
    verificationTarget: string;
  }[];
}

@Injectable()
export class AiAuditBriefingService {
  private readonly logger = new Logger(AiAuditBriefingService.name);

  constructor(
    @InjectRepository(AuditExecution)
    private execRepo: Repository<AuditExecution>,
    @InjectRepository(AuditSchedule)
    private schedRepo: Repository<AuditSchedule>,
    @InjectRepository(Equipment)
    private eqRepo: Repository<Equipment>,
    @InjectRepository(Document)
    private docRepo: Repository<Document>,
    @InjectRepository(HiraRisk)
    private hiraRepo: Repository<HiraRisk>,
    @InjectRepository(EaaRisk)
    private eaaRepo: Repository<EaaRisk>,
  ) {}

  async generatePreAuditBriefing(scheduleId?: string, departmentQuery?: string): Promise<PreAuditBriefingResponse> {
    let department = departmentQuery || 'General';
    let targetSchedule: AuditSchedule | null = null;

    if (scheduleId) {
      targetSchedule = await this.schedRepo.findOne({
        where: { id: scheduleId },
        relations: ['auditors'],
      });
      if (targetSchedule) {
        department = targetSchedule.department;
      }
    }

    const deptNorm = department.trim().toLowerCase();

    // 1. Fetch historical executions & NCs for this department
    const allExecs = await this.execRepo.find({ relations: ['schedule'] });
    const deptExecs = allExecs.filter(e => {
      const execDept = (e.schedule?.department || '').toLowerCase();
      return execDept.includes(deptNorm) || deptNorm.includes(execDept);
    });

    const historicalNCs: { clause: string; observation: string; ncStatement?: string; date: string }[] = [];
    deptExecs.forEach(exec => {
      if (exec.entries) {
        exec.entries.forEach(entry => {
          if (entry.status === 'NC') {
            historicalNCs.push({
              clause: entry.clause || 'N/A',
              observation: entry.observation || entry.ncStatement || '',
              ncStatement: entry.ncStatement,
              date: new Date(exec.date).toLocaleDateString(),
            });
          }
        });
      }
    });

    // Categorize NCs to find repeat themes
    const themeCounts: { [theme: string]: { count: number; clauses: Set<string>; desc: string } } = {};
    historicalNCs.forEach(nc => {
      const text = (nc.clause + ' ' + nc.observation + ' ' + (nc.ncStatement || '')).toLowerCase();
      let theme = 'General SOP Non-Compliance';

      if (text.includes('calibrat') || text.includes('instrument') || text.includes('measur') || text.includes('gauge')) {
        theme = 'Equipment Calibration & Measurement Traceability';
      } else if (text.includes('sop') || text.includes('work instruction') || text.includes('procedure') || text.includes('obsolete')) {
        theme = 'Control of Documented Information & Obsolete SOPs';
      } else if (text.includes('training') || text.includes('competenc') || text.includes('skill')) {
        theme = 'Personnel Competence & Training Records';
      } else if (text.includes('maintenance') || text.includes('breakdown') || text.includes('pm')) {
        theme = 'Infrastructure & Preventive Maintenance';
      } else if (text.includes('clean') || text.includes('housekeeping') || text.includes('5s')) {
        theme = 'Work Environment & Housekeeping (5S)';
      } else if (text.includes('risk') || text.includes('safety') || text.includes('ppe')) {
        theme = 'Occupational Health, Safety & PPE Adherence';
      }

      if (!themeCounts[theme]) {
        themeCounts[theme] = { count: 0, clauses: new Set(), desc: nc.observation };
      }
      themeCounts[theme].count++;
      if (nc.clause) themeCounts[theme].clauses.add(nc.clause);
    });

    const repeatNCs = Object.entries(themeCounts)
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        lastClauses: Array.from(data.clauses),
        description: data.desc || `Repeated non-conformance logged ${data.count} times in previous audits.`,
      }))
      .sort((a, b) => b.count - a.count);

    // 2. Fetch Equipment for this department
    const deptEq = await this.eqRepo.find({
      where: { department: ILike(`%${department}%`) },
    });
    const today = new Date();
    const overdueEquipment = deptEq
      .filter(e => e.status === ('active' as any) && e.nextCalibrationDate && new Date(e.nextCalibrationDate) < today)
      .map(e => ({
        equipmentNumber: e.equipmentNumber,
        name: e.name,
        nextCalibrationDate: new Date(e.nextCalibrationDate).toLocaleDateString(),
        status: e.status,
      }));

    // 3. Fetch Document Revisions for this department (last 60 days)
    const allDocs = await this.docRepo.find();
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentDocRevisions = allDocs
      .filter(d => {
        if (!d.departments) return false;
        const deptList: string[] = Array.isArray(d.departments)
          ? d.departments
          : typeof d.departments === 'string'
          ? (d.departments as string).split(',')
          : [];
        const matchesDept = deptList.some(deptStr => deptStr.toLowerCase().includes(deptNorm) || deptNorm.includes(deptStr.toLowerCase()));
        const isRecent = d.updatedAt && new Date(d.updatedAt) >= sixtyDaysAgo;
        return matchesDept && isRecent;
      })
      .map(d => ({
        documentNumber: d.documentNumber || 'N/A',
        title: d.title,
        type: d.type || 'SOP',
        updatedAt: new Date(d.updatedAt).toLocaleDateString(),
      }));

    // 4. Fetch HIRA / EAA High Risks
    const deptHira = await this.hiraRepo.find({ where: { department: ILike(`%${department}%`) } });
    const deptEaa = await this.eaaRepo.find({ where: { department: ILike(`%${department}%`) } });

    const highRisks: { type: 'HIRA' | 'EAA'; riskNumber: string; description: string; riskLevel: string }[] = [];
    deptHira.filter(h => ['high', 'critical'].includes((h.maxRiskLevel || '').toLowerCase())).forEach(h => {
      highRisks.push({
        type: 'HIRA',
        riskNumber: h.riskNumber || 'HIRA',
        description: `${h.activity || ''}${h.task ? ' - ' + h.task : ''}`,
        riskLevel: (h.maxRiskLevel || 'HIGH').toUpperCase(),
      });
    });
    deptEaa.filter(e => ['high', 'critical'].includes((e.maxRiskLevel || '').toLowerCase())).forEach(e => {
      highRisks.push({
        type: 'EAA',
        riskNumber: e.riskNumber || 'EAA',
        description: `${e.process || ''}${e.area ? ' - ' + e.area : ''}`,
        riskLevel: (e.maxRiskLevel || 'HIGH').toUpperCase(),
      });
    });

    // 5. Calculate Risk Score
    let score = 25; // Base risk
    if (repeatNCs.length > 0) score += Math.min(repeatNCs.length * 15, 35);
    if (overdueEquipment.length > 0) score += Math.min(overdueEquipment.length * 10, 25);
    if (recentDocRevisions.length > 0) score += Math.min(recentDocRevisions.length * 5, 15);
    if (highRisks.length > 0) score += Math.min(highRisks.length * 5, 15);

    score = Math.min(Math.max(score, 10), 98);
    const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = score >= 70 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';

    // 6. Generate Tailored Audit Checklist strictly with ISO 9001, ISO 14001, ISO 45001
    const recommendedChecklist: PreAuditBriefingResponse['recommendedChecklist'] = [
      {
        id: 1,
        isoStandard: 'ISO 9001:2015',
        clauseNumber: '7.1.5.1',
        clauseTitle: 'Measurement Traceability & Calibration',
        auditQuestion: `Verify if all active measuring instruments in ${department} (e.g. ${overdueEquipment.length > 0 ? overdueEquipment[0].name : 'gauges & meters'}) have valid, unexpired calibration certificates.`,
        verificationTarget: overdueEquipment.length > 0 ? `Check ${overdueEquipment.map(e => e.equipmentNumber).join(', ')}` : 'Physical sticker & master calibration log cross-check',
      },
      {
        id: 2,
        isoStandard: 'ISO 9001:2015',
        clauseNumber: '7.5.3.2',
        clauseTitle: 'Control of Documented Information (Obsolete SOP Check)',
        auditQuestion: `Verify whether shopfloor operators in ${department} are operating strictly using current revision documents and that no obsolete SOPs/WIs are displayed.`,
        verificationTarget: recentDocRevisions.length > 0 ? `Inspect revised SOP ${recentDocRevisions[0].documentNumber} (${recentDocRevisions[0].title})` : 'Verify Level 3 SOPs against central DMS repository',
      },
      {
        id: 3,
        isoStandard: 'ISO 9001:2015',
        clauseNumber: '10.2.1',
        clauseTitle: 'Nonconformity & Corrective Action (Repeat NC Verification)',
        auditQuestion: `Inspect if past audit NCs related to "${repeatNCs.length > 0 ? repeatNCs[0].theme : 'Process Compliance'}" have effective root cause elimination and preventive actions verified on-site.`,
        verificationTarget: `Review corrective action evidence for previous ${department} NCs`,
      },
      {
        id: 4,
        isoStandard: 'ISO 45001:2018',
        clauseNumber: '8.1.2',
        clauseTitle: 'Eliminating Hazards & Reducing OH&S Risks',
        auditQuestion: `Check if high-risk safety hazards identified in HIRA for ${department} have operational controls and mandatory PPE compliance active.`,
        verificationTarget: highRisks.length > 0 ? `Verify safety controls for ${highRisks[0].description}` : 'Physical inspection of machine guards, emergency stops, and PPE usage',
      },
      {
        id: 5,
        isoStandard: 'ISO 14001:2015',
        clauseNumber: '8.1',
        clauseTitle: 'Operational Planning & Environmental Control',
        auditQuestion: `Verify waste segregation, chemical handling, and environmental control measures for ${department} as per Environmental Aspects & Impacts (EAA) register.`,
        verificationTarget: 'Inspect waste collection area, spill kits, and MSDS availability',
      },
    ];

    const summary = `Pre-audit briefing for ${department} Department: Calculated Audit Risk Score is ${score}% (${riskLevel} RISK). Found ${repeatNCs.length} repeat NC theme(s), ${overdueEquipment.length} overdue calibration instrument(s), ${recentDocRevisions.length} recent SOP revision(s), and ${highRisks.length} high-severity risk factor(s). Recommended focus areas include ISO 9001:2015 (Calibration & Document Control), ISO 45001:2018 (Safety Hazards), and ISO 14001:2015 (Environmental Controls).`;

    return {
      department,
      scheduleId,
      scope: targetSchedule?.scope,
      plannedDate: targetSchedule?.date ? new Date(targetSchedule.date).toLocaleDateString() : undefined,
      riskScore: score,
      riskLevel,
      summary,
      repeatNCs,
      overdueEquipment,
      recentDocRevisions,
      highRisks,
      recommendedChecklist,
    };
  }
}
