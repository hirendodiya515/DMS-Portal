import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Document } from '../entities/document.entity';
import { Equipment } from '../entities/equipment.entity';
import { Risk } from '../entities/risk.entity';
import { Objective } from '../entities/objective.entity';
import { SystemSetting } from '../entities/system-setting.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Document, Equipment, Risk, Objective, SystemSetting]),
    ],
    controllers: [SearchController],
    providers: [SearchService],
})
export class SearchModule {}
