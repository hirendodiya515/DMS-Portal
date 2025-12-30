import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetenciesController } from './competencies.controller';
import { CompetenciesService } from './competencies.service';
import { Competency } from '../entities/competency.entity';
import { JobRole } from '../entities/job-role.entity';
import { CompetencyRequirement } from '../entities/competency-requirement.entity';
import { EmployeeSkill } from '../entities/employee-skill.entity';
import { TrainingProgram } from '../entities/training-program.entity';
import { TrainingPlan } from '../entities/training-plan.entity';
import { User } from '../entities/user.entity';
import { OrgNode } from '../entities/org-node.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Competency,
            JobRole,
            CompetencyRequirement,
            EmployeeSkill,
            TrainingProgram,
            TrainingPlan,
            User,
            OrgNode,
        ]),
    ],
    controllers: [CompetenciesController],
    providers: [CompetenciesService],
    exports: [CompetenciesService],
})
export class CompetenciesModule {}
