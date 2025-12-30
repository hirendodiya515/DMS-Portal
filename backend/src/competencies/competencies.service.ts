import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Competency } from '../entities/competency.entity';
import { JobRole } from '../entities/job-role.entity';
import { CompetencyRequirement } from '../entities/competency-requirement.entity';
import { EmployeeSkill } from '../entities/employee-skill.entity';
import { TrainingProgram } from '../entities/training-program.entity';
import { TrainingPlan, TrainingStatus } from '../entities/training-plan.entity';
import { OrgNode } from '../entities/org-node.entity';
import {
    CreateCompetencyDto,
    CreateJobRoleDto,
    CreateCompetencyRequirementDto,
    RateEmployeeSkillDto,
    CreateTrainingProgramDto,
    AssignTrainingPlanDto,
    UpdateTrainingStatusDto,
} from './dto/competency.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class CompetenciesService {
    constructor(
        @InjectRepository(Competency) private competencyRepo: Repository<Competency>,
        @InjectRepository(JobRole) private jobRoleRepo: Repository<JobRole>,
        @InjectRepository(CompetencyRequirement) private requirementRepo: Repository<CompetencyRequirement>,
        @InjectRepository(EmployeeSkill) private skillRepo: Repository<EmployeeSkill>,
        @InjectRepository(TrainingProgram) private programRepo: Repository<TrainingProgram>,
        @InjectRepository(TrainingPlan) private planRepo: Repository<TrainingPlan>,
        @InjectRepository(OrgNode) private employeeRepo: Repository<OrgNode>,
        @InjectRepository(User) private userRepo: Repository<User>,
    ) {}

    // --- Competencies ---
    createCompetency(dto: CreateCompetencyDto) {
        const entity = this.competencyRepo.create(dto);
        return this.competencyRepo.save(entity);
    }

    findAllCompetencies() {
        return this.competencyRepo.find();
    }

    async updateCompetency(id: string, dto: CreateCompetencyDto) {
        const competency = await this.competencyRepo.findOne({ where: { id } });
        if (!competency) throw new NotFoundException('Competency not found');
        
        Object.assign(competency, dto);
        return this.competencyRepo.save(competency);
    }

    async deleteCompetency(id: string) {
        const result = await this.competencyRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Competency not found');
        return { message: 'Competency deleted successfully' };
    }

    // --- Job Roles ---
    createJobRole(dto: CreateJobRoleDto) {
        const entity = this.jobRoleRepo.create(dto);
        return this.jobRoleRepo.save(entity);
    }

    findAllJobRoles() {
        return this.jobRoleRepo.find();
    }

    async updateJobRole(id: string, dto: CreateJobRoleDto) {
        const role = await this.jobRoleRepo.findOne({ where: { id } });
        if (!role) throw new NotFoundException('Job Role not found');
        
        Object.assign(role, dto);
        return this.jobRoleRepo.save(role);
    }

    async deleteJobRole(id: string) {
        const result = await this.jobRoleRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Job Role not found');
        return { message: 'Job Role deleted successfully' };
    }

    // --- Requirements ---
    async addRequirement(dto: CreateCompetencyRequirementDto) {
        // Check if exists to update or create
        let req = await this.requirementRepo.findOne({
            where: { jobRoleId: dto.jobRoleId, competencyId: dto.competencyId },
        });
        if (req) {
            req.requiredLevel = dto.requiredLevel;
        } else {
            req = this.requirementRepo.create(dto);
        }
        return this.requirementRepo.save(req);
    }

    async deleteRequirement(jobRoleId: string, competencyId: string) {
        const result = await this.requirementRepo.delete({ jobRoleId, competencyId });
        if (result.affected === 0) throw new NotFoundException('Requirement not found');
        return { message: 'Requirement deleted successfully' };
    }

    getRequirementsByRole(roleId: string) {
        return this.requirementRepo.find({
            where: { jobRoleId: roleId },
            relations: ['competency'],
        });
    }

    // --- Employee Skills ---
    async rateSkill(dto: RateEmployeeSkillDto) {
        let skill = await this.skillRepo.findOne({
            where: { employeeId: dto.employeeId, competencyId: dto.competencyId },
        });
        if (skill) {
            skill.currentLevel = dto.currentLevel;
        } else {
            skill = this.skillRepo.create(dto);
        }
        return this.skillRepo.save(skill);
    }

    getEmployeeSkills(employeeId: string) {
        return this.skillRepo.find({
            where: { employeeId },
            relations: ['competency'],
        });
    }

    // --- Gap Analysis ---
    async getGapAnalysis(employeeId: string, roleId: string) {
        // 1. Get Requirements
        const requirements = await this.requirementRepo.find({
            where: { jobRoleId: roleId },
            relations: ['competency'],
        });

        // 2. Get Current Skills
        const skills = await this.skillRepo.find({
            where: { employeeId },
        });
        const skillMap = new Map(skills.map(s => [s.competencyId, s.currentLevel]));

        // 3. Calculate Gap
        return requirements.map(req => {
            const currentLevel = skillMap.get(req.competencyId) || 0;
            const gap = req.requiredLevel - currentLevel;
            return {
                competency: req.competency,
                requiredLevel: req.requiredLevel,
                currentLevel,
                gap,
                status: gap <= 0 ? 'Meets' : gap === 1 ? 'Needs Improvement' : 'Critical',
            };
        });
    }

    // --- Training ---
    createTrainingProgram(dto: CreateTrainingProgramDto) {
        const entity = this.programRepo.create(dto);
        return this.programRepo.save(entity);
    }

    findAllPrograms() {
        return this.programRepo.find({ relations: ['targetCompetency'] });
    }

    assignTraining(dto: AssignTrainingPlanDto) {
        const entity = this.planRepo.create(dto);
        return this.planRepo.save(entity);
    }

    async updateTrainingStatus(id: string, dto: UpdateTrainingStatusDto) {
        const plan = await this.planRepo.findOne({ where: { id } });
        if (!plan) throw new NotFoundException('Training plan not found');
        
        plan.status = dto.status as TrainingStatus;
        if (dto.completionDate) plan.completionDate = dto.completionDate;
        
        return this.planRepo.save(plan);
    }

    getUserTrainingPlan(employeeId: string) {
        return this.planRepo.find({
            where: { employeeId },
            relations: ['trainingProgram', 'trainingProgram.targetCompetency'],
        });
    }

    // --- Dashboard Summary APIs ---

    async getDepartmentSummary() {
        const employees = await this.employeeRepo.find({ relations: ['jobRole'] });
        const allRequirements = await this.requirementRepo.find();
        const allSkills = await this.skillRepo.find();

        const deptMap = new Map<string, { required: number; actual: number }>();

        employees.forEach((employee) => {
            const dept = employee.department || 'Unassigned';
            if (!deptMap.has(dept)) {
                deptMap.set(dept, { required: 0, actual: 0 });
            }
            const summary = deptMap.get(dept);

            if (employee.jobRoleId && summary) {
                const userReqs = allRequirements.filter((r) => r.jobRoleId === employee.jobRoleId);
                userReqs.forEach((req) => {
                    summary.required += req.requiredLevel;
                    const skill = allSkills.find(
                        (s) => s.employeeId === employee.id && s.competencyId === req.competencyId,
                    );
                    summary.actual += skill ? skill.currentLevel : 0;
                });
            }
        });

        return Array.from(deptMap.entries()).map(([department, scores]) => ({
            department,
            ...scores,
        }));
    }

    async getDepartmentUserSummary(department: string) {
        const employees = await this.employeeRepo.find({
            where: { department: department === 'Unassigned' ? IsNull() : department },
            relations: ['jobRole'],
        });
        const allRequirements = await this.requirementRepo.find();
        const allSkills = await this.skillRepo.find();

        return employees.map((employee) => {
            let required = 0;
            let actual = 0;
            if (employee.jobRoleId) {
                const userReqs = allRequirements.filter((r) => r.jobRoleId === employee.jobRoleId);
                userReqs.forEach((req) => {
                    required += req.requiredLevel;
                    const skill = allSkills.find(
                        (s) => s.employeeId === employee.id && s.competencyId === req.competencyId,
                    );
                    actual += skill ? skill.currentLevel : 0;
                });
            }
            return {
                id: employee.id,
                name: employee.name,
                role: employee.jobRole?.title || employee.designation || 'No Role',
                required,
                actual,
                jobRoleId: employee.jobRoleId
            };
        });
    }

    async getCompetencyGapSummary() {
        const competencies = await this.competencyRepo.find();
        const employees = await this.employeeRepo.find();
        const allRequirements = await this.requirementRepo.find();
        const allSkills = await this.skillRepo.find();

        const compGaps = competencies.map((comp) => {
            let totalGap = 0;
            employees.forEach((employee) => {
                if (employee.jobRoleId) {
                    const req = allRequirements.find(
                        (r) => r.jobRoleId === employee.jobRoleId && r.competencyId === comp.id,
                    );
                    if (req) {
                        const skill = allSkills.find(
                            (s) => s.employeeId === employee.id && s.competencyId === comp.id,
                        );
                        const current = skill ? skill.currentLevel : 0;
                        const gap = Math.max(0, req.requiredLevel - current);
                        totalGap += gap;
                    }
                }
            });
            return {
                name: comp.name,
                gap: totalGap,
            };
        });

        // Calculate cumulative percentage for Pareto
        const sortedGaps = compGaps.filter(c => c.gap > 0).sort((a, b) => b.gap - a.gap);
        const totalGapSum = sortedGaps.reduce((acc, curr) => acc + curr.gap, 0);
        
        let cumulativeSum = 0;
        return sortedGaps.map(item => {
            cumulativeSum += item.gap;
            return {
                ...item,
                percentage: totalGapSum > 0 ? (cumulativeSum / totalGapSum) * 100 : 0
            };
        });
    }
}
