import { PartialType } from '@nestjs/mapped-types';
import { CreatePfmeaWorksheetRowDto } from './create-pfmea-worksheet-row.dto';

export class UpdatePfmeaWorksheetRowDto extends PartialType(CreatePfmeaWorksheetRowDto) {}
