import { PartialType } from '@nestjs/mapped-types';
import { CreatePfmeaDto } from './create-pfmea.dto';

export class UpdatePfmeaDto extends PartialType(CreatePfmeaDto) {}
