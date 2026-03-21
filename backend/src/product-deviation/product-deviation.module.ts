import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductDeviationController } from './product-deviation.controller';
import { ProductDeviationService } from './product-deviation.service';
import { ProductDeviation } from '../entities/product-deviation.entity';
import { ProductDeviationResponsible } from '../entities/product-deviation-responsible.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { SystemSetting } from '../entities/system-setting.entity';

import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductDeviation, ProductDeviationResponsible, User, AuditLog, SystemSetting]),
    MailModule,
  ],
  controllers: [ProductDeviationController],
  providers: [ProductDeviationService]
})
export class ProductDeviationModule {}
