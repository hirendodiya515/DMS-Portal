import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SwotIssue } from '../entities/swot-issue.entity';
import { InterestedParty } from '../entities/interested-party.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { OrgContextLog } from '../entities/org-context-log.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class OrgContextService {
  constructor(
    @InjectRepository(SwotIssue)
    private readonly issueRepository: Repository<SwotIssue>,
    @InjectRepository(InterestedParty)
    private readonly partyRepository: Repository<InterestedParty>,
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
    @InjectRepository(OrgContextLog)
    private readonly logRepository: Repository<OrgContextLog>,
  ) {}

  // Helper for logging changes
  private async logChange(
    tab: 'swot' | 'party' | 'scope' | 'general',
    action: 'add' | 'edit' | 'delete' | 'review',
    itemName: string,
    details: string,
    userId: string,
  ) {
    if (!userId) return;
    try {
      const log = this.logRepository.create({
        tab,
        action,
        itemName,
        details,
        userId,
      });
      await this.logRepository.save(log);
    } catch (e) {
      console.error('Failed to save org context log:', e);
    }
  }

  // SWOT Issues
  findAllIssues() {
    return this.issueRepository.find({ order: { createdAt: 'DESC' } });
  }

  async createIssue(data: Partial<SwotIssue>, userId: string) {
    const issue = this.issueRepository.create(data);
    const saved = await this.issueRepository.save(issue);
    await this.logChange('swot', 'add', saved.text, `Added SWOT Issue: "${saved.text}" (${saved.category})`, userId);
    return saved;
  }

  async updateIssue(id: string, data: Partial<SwotIssue>, userId: string) {
    await this.issueRepository.update(id, data);
    const updated = await this.issueRepository.findOne({ where: { id } });
    if (updated) {
      await this.logChange('swot', 'edit', updated.text, `Updated SWOT Issue: "${updated.text}" (${updated.category})`, userId);
    }
    return updated;
  }

  async deleteIssue(id: string, userId: string) {
    const issue = await this.issueRepository.findOne({ where: { id } });
    if (issue) {
      await this.issueRepository.delete(id);
      await this.logChange('swot', 'delete', issue.text, `Deleted SWOT Issue: "${issue.text}" (${issue.category})`, userId);
    }
    return { deleted: true };
  }

  // Interested Parties
  findAllParties() {
    return this.partyRepository.find({ order: { createdAt: 'DESC' } });
  }

  async createParty(data: Partial<InterestedParty>, userId: string) {
    const party = this.partyRepository.create(data);
    const saved = await this.partyRepository.save(party);
    await this.logChange('party', 'add', saved.name, `Added Interested Party: "${saved.name}"`, userId);
    return saved;
  }

  async updateParty(id: string, data: Partial<InterestedParty>, userId: string) {
    await this.partyRepository.update(id, data);
    const updated = await this.partyRepository.findOne({ where: { id } });
    if (updated) {
      await this.logChange('party', 'edit', updated.name, `Updated Interested Party: "${updated.name}"`, userId);
    }
    return updated;
  }

  async deleteParty(id: string, userId: string) {
    const party = await this.partyRepository.findOne({ where: { id } });
    if (party) {
      await this.partyRepository.delete(id);
      await this.logChange('party', 'delete', party.name, `Deleted Interested Party: "${party.name}"`, userId);
    }
    return { deleted: true };
  }

  // IMS Scope
  async getImsScope() {
    const setting = await this.settingsRepository.findOne({ where: { key: 'ims_scope_text' } });
    return setting ? setting.value : { content: '', exclusions: [] };
  }

  async updateImsScope(data: any, userId: string) {
    let setting = await this.settingsRepository.findOne({ where: { key: 'ims_scope_text' } });
    if (setting) {
      setting.value = data;
    } else {
      setting = this.settingsRepository.create({ key: 'ims_scope_text', value: data });
    }
    await this.settingsRepository.save(setting);
    await this.logChange('scope', 'edit', 'IMS Scope', 'Updated IMS Scope Statement', userId);
    return setting.value;
  }

  // History & Manual Reviews
  async findAllHistory() {
    return this.logRepository.find({
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async logReview(userId: string, details: string) {
    await this.logChange('general', 'review', 'Context of Organization', details || 'Reviewed all 3 tabs', userId);
    return { success: true };
  }

  async exportParties(): Promise<Buffer> {
    const parties = await this.findAllParties();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Interested Parties');

    worksheet.columns = [
      { header: 'Interested Party', key: 'name', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Standards', key: 'standards', width: 20 },
      { header: 'Needs & Expectations', key: 'needs', width: 35 },
      { header: 'Statutory/Compliance Obligations', key: 'complianceObligations', width: 35 },
      { header: 'Associated Risks', key: 'associatedRisks', width: 35 },
      { header: 'Associated Opportunities', key: 'associatedOpportunities', width: 35 },
      { header: 'Risk if Unmet', key: 'risk', width: 15 },
      { header: 'Mitigations / Actions', key: 'actions', width: 40 },
      { header: 'Responsible Department', key: 'responsible', width: 25 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];

    parties.forEach((party) => {
      worksheet.addRow({
        name: party.name,
        category: party.category || 'Internal',
        standards: party.standards ? party.standards.join(', ') : '',
        needs: party.needs || '',
        complianceObligations: party.complianceObligations || 'N/A',
        associatedRisks: party.associatedRisks || 'N/A',
        associatedOpportunities: party.associatedOpportunities || 'N/A',
        risk: party.risk || 'Medium',
        actions: party.actions ? party.actions.join('\n') : '',
        responsible: party.responsible || 'N/A',
        createdAt: party.createdAt ? new Date(party.createdAt).toLocaleString('en-IN') : '',
        updatedAt: party.updatedAt ? new Date(party.updatedAt).toLocaleString('en-IN') : '',
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Style alignment for multi-line action cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell('actions').alignment = { wrapText: true };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
