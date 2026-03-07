import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SwotIssue } from '../entities/swot-issue.entity';
import { InterestedParty } from '../entities/interested-party.entity';
import { SystemSetting } from '../entities/system-setting.entity';

@Injectable()
export class OrgContextService {
  constructor(
    @InjectRepository(SwotIssue)
    private readonly issueRepository: Repository<SwotIssue>,
    @InjectRepository(InterestedParty)
    private readonly partyRepository: Repository<InterestedParty>,
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
  ) {}

  // SWOT Issues
  findAllIssues() {
    return this.issueRepository.find({ order: { createdAt: 'DESC' } });
  }

  createIssue(data: Partial<SwotIssue>) {
    const issue = this.issueRepository.create(data);
    return this.issueRepository.save(issue);
  }

  async updateIssue(id: string, data: Partial<SwotIssue>) {
    await this.issueRepository.update(id, data);
    return this.issueRepository.findOne({ where: { id } });
  }

  async deleteIssue(id: string) {
    await this.issueRepository.delete(id);
    return { deleted: true };
  }

  // Interested Parties
  findAllParties() {
    return this.partyRepository.find({ order: { createdAt: 'DESC' } });
  }

  createParty(data: Partial<InterestedParty>) {
    const party = this.partyRepository.create(data);
    return this.partyRepository.save(party);
  }

  async updateParty(id: string, data: Partial<InterestedParty>) {
    await this.partyRepository.update(id, data);
    return this.partyRepository.findOne({ where: { id } });
  }

  async deleteParty(id: string) {
    await this.partyRepository.delete(id);
    return { deleted: true };
  }

  // IMS Scope
  async getImsScope() {
    const setting = await this.settingsRepository.findOne({ where: { key: 'ims_scope_text' } });
    return setting ? setting.value : { content: '', exclusions: [] };
  }

  async updateImsScope(data: any) {
    let setting = await this.settingsRepository.findOne({ where: { key: 'ims_scope_text' } });
    if (setting) {
      setting.value = data;
    } else {
      setting = this.settingsRepository.create({ key: 'ims_scope_text', value: data });
    }
    await this.settingsRepository.save(setting);
    return setting.value;
  }
}
