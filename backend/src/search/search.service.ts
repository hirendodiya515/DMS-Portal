import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Document } from '../entities/document.entity';
import { Equipment } from '../entities/equipment.entity';
import { Risk } from '../entities/risk.entity';
import { Objective } from '../entities/objective.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { UserRole } from '../entities/user.entity';

export interface SearchResult {
    id: string;
    title: string;
    category: string;
    route: string;
    subtitle?: string;
}

@Injectable()
export class SearchService {
    constructor(
        @InjectRepository(Document)
        private documentRepository: Repository<Document>,
        @InjectRepository(Equipment)
        private equipmentRepository: Repository<Equipment>,
        @InjectRepository(Risk)
        private riskRepository: Repository<Risk>,
        @InjectRepository(Objective)
        private objectiveRepository: Repository<Objective>,
        @InjectRepository(SystemSetting)
        private settingsRepository: Repository<SystemSetting>,
    ) {}

    async search(query: string, userRole: UserRole): Promise<SearchResult[]> {
        if (!query || query.length < 2) return [];

        const results: SearchResult[] = [];
        const searchTerm = `%${query}%`;
        const queryLower = query.toLowerCase();

        // --- Static Page Suggestions ---
        const pages = [
            { title: 'Dashboard', route: '/', keywords: ['home', 'dashboard', 'main'] },
            { title: 'Documents', route: '/documents', keywords: ['docs', 'files', 'library'] },
            { title: 'Org Chart', route: '/org-chart', keywords: ['organization', 'structure', 'hierarchy', 'employees'] },
            { title: 'Objectives', route: '/objectives', keywords: ['kpi', 'targets', 'performance'] },
            { title: 'Risks', route: '/risks', keywords: ['assessment', 'qra', 'hira', 'eaa'] },
            { title: 'Flowcharts', route: '/flowchart', keywords: ['process', 'diagram', 'workflow'] },
            { title: 'Audit Logs', route: '/audit-logs', keywords: ['history', 'activity', 'events'] },
            { title: 'Internal Audit Plan', route: '/internal-audit/plan', keywords: ['audit', 'planning'] },
            { title: 'Internal Audit Schedule', route: '/internal-audit/schedule', keywords: ['audit', 'timing'] },
            { title: 'Competency Dashboard', route: '/competency/dashboard', keywords: ['skill', 'gap', 'matrix'] },
            { title: 'Skill Assessment', route: '/competency/assessment', keywords: ['test', 'evaluation'] },
            { title: 'Calibration & Equipment', route: '/calibration-equipment', keywords: ['maintenance', 'tools', 'instruments'] },
            { title: 'Settings', route: '/settings', keywords: ['configuration', 'system', 'admin'] },
        ];

        const matchedPages = pages.filter(p => 
            p.title.toLowerCase().includes(queryLower) || 
            p.keywords.some(k => k.toLowerCase().includes(queryLower))
        );

        results.push(...matchedPages.map(p => ({ 
            id: p.route, 
            title: `Go to ${p.title}`, 
            category: 'Page', 
            route: p.route 
        })));

        // --- Dynamic Entity Results ---
        
        // 1. Documents
        const docs = await this.documentRepository.find({
            where: [
                { title: ILike(searchTerm) },
                { documentNumber: ILike(searchTerm) },
            ],
            take: 5
        });
        results.push(...docs.map(d => ({ 
            id: d.id, 
            title: d.title, 
            category: 'Document', 
            route: `/documents/${d.id}`,
            subtitle: d.documentNumber
        })));

        // 2. Equipment
        const equipment = await this.equipmentRepository.find({
            where: [
                { name: ILike(searchTerm) },
                { equipmentNumber: ILike(searchTerm) },
            ],
            take: 5
        });
        results.push(...equipment.map(e => ({ 
            id: e.id, 
            title: e.name, 
            category: 'Equipment', 
            route: `/calibration-equipment`,
            subtitle: e.equipmentNumber
        })));

        // 3. Risks
        const risks = await this.riskRepository.find({
            where: [
                { title: ILike(searchTerm) },
                { riskNumber: ILike(searchTerm) },
            ],
            take: 5
        });
        results.push(...risks.map(r => ({ 
            id: r.id, 
            title: r.title, 
            category: 'Risk', 
            route: `/risks`,
            subtitle: r.riskNumber
        })));

        // 4. Objectives
        const objectives = await this.objectiveRepository.find({
            where: [
                { name: ILike(searchTerm) },
                { objectiveNumber: ILike(searchTerm) },
            ],
            take: 5
        });
        results.push(...objectives.map(o => ({ 
            id: o.id, 
            title: o.name, 
            category: 'Objective', 
            route: `/objectives`,
            subtitle: o.objectiveNumber
        })));

        // 5. Settings (Admin only)
        if (userRole === UserRole.ADMIN) {
            const settings = await this.settingsRepository.find({
                where: { key: ILike(searchTerm) },
                take: 5
            });
            results.push(...settings.map(s => ({ 
                id: s.key, 
                title: s.key, 
                category: 'Setting', 
                route: `/settings` 
            })));
        }

        return results;
    }
}
