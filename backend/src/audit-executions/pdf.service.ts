import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditExecution } from '../entities/audit-execution.entity';
import { AuditParticipant, AuditParticipantType } from '../entities/audit-participant.entity';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  constructor(
    @InjectRepository(AuditExecution)
    private executionRepo: Repository<AuditExecution>,
    @InjectRepository(AuditParticipant)
    private participantRepo: Repository<AuditParticipant>,
  ) {}

  private getLogoBase64(): string {
    try {
      // Navigate up from: src/audit-executions -> src -> backend -> dms (root) -> frontend/public
      const logoPath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      console.error('Failed to load logo:', error);
      // Return a fallback SVG if logo fails to load
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iODAiPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiNmMWY1ZjkiIHN0cm9rZT0iIzMzNDE1NSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iNjAiIHk9IjQ1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMzM0MTU1Ij5MT0dPPC90ZXh0Pjwvc3ZnPg==';
    }
  }

  async generateAuditReportPDF(executionId: string): Promise<Buffer> {
    // Fetch audit execution data
    const execution = await this.executionRepo.findOne({
      where: { id: executionId },
      relations: ['schedule', 'schedule.auditors'],
    });

    if (!execution) {
      throw new Error('Audit execution not found');
    }

    // Fetch auditees
    const auditees = await this.participantRepo.find({
      where: {
        department: execution.schedule.department,
        type: AuditParticipantType.AUDITEE,
      },
    });

    // Generate HTML content
    const logoBase64 = this.getLogoBase64();
    const htmlContent = this.generateHTML(execution, auditees, logoBase64);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm',
      },
      displayHeaderFooter: false,
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  }

  private generateHTML(execution: any, auditees: any[], logoBase64: string): string {
    const ncEntries = execution.entries?.filter((e) => e.status === 'NC') || [];
    const auditeeNames =
      auditees.length > 0
        ? auditees.map((a) => a.name).join(', ')
        : execution.schedule.department;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; }
    .header { display: grid; grid-template-columns: 2fr 6fr 4fr; gap: 10px; border: 2px solid #334155; margin-bottom: 20px; }
    .header-left { border-right: 2px solid #334155; padding: 15px; display: flex; align-items: center; justify-content: center; }
    .header-center { border-right: 2px solid #334155; padding: 15px; text-align: center; }
    .header-right { padding: 10px; }
    .header-right > div { margin-bottom: 5px; font-size: 9pt; white-space: nowrap; }
    .logo { width: 100%; max-width: 120px; height: auto; }
    .title { font-weight: bold; font-size: 14pt; margin-bottom: 5px; }
    .subtitle { font-size: 10pt; color: #64748b; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
    .details-table th, .details-table td { border: 1px solid #94a3b8; padding: 8px; text-align: left; }
    .details-table th { background-color: #f1f5f9; font-weight: 600; }
    .section-title { font-weight: bold; font-size: 11pt; text-transform: uppercase; border-bottom: 2px solid #1e293b; padding-bottom: 5px; margin: 20px 0 10px 0; }
    .obs-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
    .obs-table th, .obs-table td { border: 1px solid #94a3b8; padding: 6px; vertical-align: top; }
    .obs-table th { background-color: #f1f5f9; font-weight: 600; text-align: left; }
    .obs-table td { text-align: left; }
    .nc-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
    .nc-table th { background-color: #991b1b; color: white; border: 1px solid #7f1d1d; padding: 6px; }
    .nc-table td { border: 1px solid #94a3b8; padding: 6px; vertical-align: top; }
    .summary { display: flex; justify-content: space-around; text-align: center; border: 1px solid #94a3b8; background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .summary-item { flex: 1; }
    .summary-label { font-size: 9pt; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
    .summary-value { font-size: 18pt; font-weight: bold; }
    .summary-value.red { color: #dc2626; }
    .summary-value.yellow { color: #ca8a04; }
    .summary-value.green { color: #16a34a; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #334155; font-size: 9pt; color: #64748b; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <img src="${logoBase64}" class="logo" alt="Company Logo">
    </div>
    <div class="header-center">
      <div class="title">INTERNAL AUDIT REPORT</div>
      <div class="subtitle">ISO 9001:2015 / 14001:2015 / 45001:2018</div>
    </div>
    <div class="header-right">
      <div><strong>Doc No:</strong> MR/L4/005</div>
      <div><strong>Issue No / Date:</strong> 01 / 12.02.2020</div>
      <div><strong>Rev No:</strong> 01</div>
      <div><strong>Rev. Date:</strong> 04.12.2025</div>
    </div>
  </div>

  <!-- Audit Details -->
  <table class="details-table">
    <tr>
      <th style="width: 25%;">Department</th>
      <td style="width: 25%;">${execution.schedule.department}</td>
      <th style="width: 25%;">Audit Date</th>
      <td style="width: 25%;">${new Date(execution.date).toLocaleDateString()}</td>
    </tr>
    <tr>
      <th>Auditee</th>
      <td colspan="3">${auditeeNames}</td>
    </tr>
    <tr>
      <th>Auditors</th>
      <td colspan="3">${execution.schedule.auditors?.map((a) => a.name).join(', ') || 'N/A'}</td>
    </tr>
  </table>

  <!-- Audit Observations -->
  <div class="section-title">Audit Observations</div>
  <table class="obs-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 15%;">Title</th>
        <th style="width: 10%;">Doc No</th>
        <th>Observation / Finding</th>
        <th style="width: 10%;">Clause</th>
        <th style="width: 8%; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${execution.entries
        ?.filter((e) => e.title)
        .map(
          (entry, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><strong>${entry.title}</strong></td>
          <td style="font-size: 9pt;">${entry.docNumber || ''}</td>
          <td>${entry.observation}</td>
          <td>${entry.clause}</td>
          <td style="text-align: center; font-weight: bold;">${entry.status}</td>
        </tr>
      `,
        )
        .join('') || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">No observations recorded.</td></tr>'}
    </tbody>
  </table>

  <!-- Non-Conformity Details -->
  ${
    ncEntries.length > 0
      ? `
  <div class="section-title">Non-Conformity Details</div>
  <table class="nc-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">Sr.</th>
        <th>NC Statement</th>
        <th style="width: 25%;">Requirement</th>
        <th style="width: 10%; text-align: center;">Clause</th>
        <th style="width: 12%; text-align: center;">Target Date</th>
      </tr>
    </thead>
    <tbody>
      ${ncEntries
        .map(
          (entry, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>${entry.ncStatement || '-'}</td>
          <td>${entry.requirement || '-'}</td>
          <td style="text-align: center;">${entry.clause}</td>
          <td style="text-align: center;">${entry.targetDate ? new Date(entry.targetDate).toLocaleDateString() : '-'}</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>
  `
      : ''
  }

  <!-- Summary -->
  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total NCs</div>
      <div class="summary-value red">${execution.entries?.filter((e) => e.status === 'NC').length || 0}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Areas for Improvement</div>
      <div class="summary-value yellow">${execution.entries?.filter((e) => e.status === 'AFI').length || 0}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Compliant Points</div>
      <div class="summary-value green">${execution.entries?.filter((e) => e.status === 'OK').length || 0}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>This is a computer-generated document. Audit conducted as per ISO 9001:2015, 14001:2015, and 45001:2018 standards.</div>
    <div style="margin-top: 10px;">Generated on: ${new Date().toLocaleString()}</div>
  </div>
</body>
</html>
    `;
  }
}
