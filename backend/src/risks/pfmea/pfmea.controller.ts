import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PfmeaService } from './pfmea.service';
import { CreatePfmeaDto } from './dto/create-pfmea.dto';
import { UpdatePfmeaDto } from './dto/update-pfmea.dto';
import { CreatePfmeaWorksheetRowDto } from './dto/create-pfmea-worksheet-row.dto';
import { UpdatePfmeaWorksheetRowDto } from './dto/update-pfmea-worksheet-row.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('pfmea')
@UseGuards(JwtAuthGuard)
export class PfmeaController {
  constructor(private readonly pfmeaService: PfmeaService) {}

  @Post()
  create(@Body() createPfmeaDto: CreatePfmeaDto, @Req() req) {
    return this.pfmeaService.createPfmea(createPfmeaDto, req.user);
  }

  @Get()
  findAll() {
    return this.pfmeaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pfmeaService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updatePfmeaDto: UpdatePfmeaDto, @Req() req) {
    return this.pfmeaService.updatePfmea(id, updatePfmeaDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.pfmeaService.deletePfmea(id, req.user);
  }

  // ==================== ROW ENDPOINTS ====================

  @Post(':id/rows')
  addRow(
    @Param('id') pfmeaId: string, 
    @Body() createRowDto: CreatePfmeaWorksheetRowDto, 
    @Req() req
  ) {
    return this.pfmeaService.addRow(pfmeaId, createRowDto, req.user);
  }

  @Put(':id/rows/:rowId')
  updateRow(
    @Param('id') pfmeaId: string, 
    @Param('rowId') rowId: string, 
    @Body() updateRowDto: UpdatePfmeaWorksheetRowDto, 
    @Req() req
  ) {
    return this.pfmeaService.updateRow(pfmeaId, rowId, updateRowDto, req.user);
  }

  @Delete(':id/rows/:rowId')
  deleteRow(
    @Param('id') pfmeaId: string, 
    @Param('rowId') rowId: string, 
    @Req() req
  ) {
    return this.pfmeaService.deleteRow(pfmeaId, rowId, req.user);
  }
}
