import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async findAll(filters?: {
    startDate?: string;
    endDate?: string;
    section?: string;
    action?: string;
    search?: string;
  }): Promise<AuditLog[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.document', 'document')
      .leftJoinAndSelect('log.objective', 'objective')
      .leftJoinAndSelect('log.risk', 'risk')
      .orderBy('log.timestamp', 'DESC');

    // Date range filter
    if (filters?.startDate && filters?.endDate) {
      query.andWhere('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    // Section filter (Documents, Objectives, Risks)
    if (filters?.section && filters.section !== 'all') {
      switch (filters.section.toLowerCase()) {
        case 'documents':
          query.andWhere('log.documentId IS NOT NULL');
          break;
        case 'objectives':
          query.andWhere('log.objectiveId IS NOT NULL');
          break;
        case 'risks':
          query.andWhere('log.riskId IS NOT NULL');
          break;
      }
    }

    // Action filter
    if (filters?.action && filters.action !== 'all') {
      query.andWhere('log.action = :action', { action: filters.action });
    }

    // Search filter (search in details or user name)
    if (filters?.search) {
      query.andWhere(
        '(log.details ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getMany();
  }

  async exportLogs(filters?: {
    startDate?: string;
    endDate?: string;
    section?: string;
    action?: string;
    search?: string;
  }): Promise<Buffer> {
    const logs = await this.findAll(filters);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');

    // Define columns
    worksheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Section', key: 'section', width: 15 },
      { header: 'Details', key: 'details', width: 50 },
    ];

    // Add rows
    logs.forEach((log) => {
      let section = 'Other';
      if (log.documentId) section = 'Documents';
      else if (log.objectiveId) section = 'Objectives';
      else if (log.riskId) section = 'Risks';

      worksheet.addRow({
        timestamp: log.timestamp,
        user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        action: log.action,
        section,
        details: log.details || '',
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
