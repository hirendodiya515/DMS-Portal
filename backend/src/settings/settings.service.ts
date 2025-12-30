import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../entities/system-setting.entity';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(SystemSetting)
        private settingsRepository: Repository<SystemSetting>,
    ) {}

    async getSetting(key: string) {
        const setting = await this.settingsRepository.findOne({ where: { key } });
        return setting ? setting.value : null;
    }

    async updateSetting(key: string, value: any) {
        const setting = this.settingsRepository.create({ key, value });
        return this.settingsRepository.save(setting);
    }

    async getAllSettings() {
        return this.settingsRepository.find();
    }
}
