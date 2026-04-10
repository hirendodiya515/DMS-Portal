import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<number>('MAIL_PORT') === 465, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendMail(to: string | string[], subject: string, html: string, senderName: string = "DMS Portal") {
    try {
      const info = await this.transporter.sendMail({
        from: `"${senderName}" <${this.configService.get<string>('MAIL_FROM')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendCalibrationAlert(
    recipientEmails: string[],
    data: {
      equipmentName: string;
      equipmentNumber: string;
      nextCalibrationDate: string;
      status: 'UPCOMING' | 'DUE';
      department: string;
    },
  ) {
    const isDue = data.status === 'DUE';
    const subject = isDue
      ? `🚨 ALERT: Equipment Calibration OVERDUE - ${data.equipmentName}`
      : `📅 Notification: Upcoming Equipment Calibration - ${data.equipmentName}`;

    const color = isDue ? '#d32f2f' : '#f57c00';
    const statusText = isDue ? 'OVERDUE' : 'UPCOMING';

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Calibration Alert</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hello,</p>
          <p>This is an automated notification regarding the calibration status of the following equipment:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Equipment Name:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.equipmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Equipment Number:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.equipmentNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Department:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.department}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Calibration Status:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${color}; font-weight: bold;">${statusText}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Next Calibration Due:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.nextCalibrationDate}</td>
            </tr>
          </table>

          <p>Please take the necessary actions to ensure the equipment is calibrated on time.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
            <p>This is an automated message from the DMS Portal. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `;

    return this.sendMail(recipientEmails, subject, html);
  }

  async sendProductDeviationAlert(
    recipientEmails: string[],
    deviationData: {
      id: string;
      serialNumber: string;
      status: string;
      line: string;
      creationDate: string;
      startDate: string;
      endDate: string;
      quantityProduced: number;
      quantityUnderDeviation: number;
      createdBy: string;
      natureOfDeviation: string;
      description: string;
      pendingWith: string;
      submittedBy?: string;
    },
  ) {
    const isClosed = deviationData.status === 'CLOSED';
    const subject = isClosed
      ? `✅ Notification: Product Deviation Closed - ${deviationData.serialNumber}`
      : `⚠️ Action Required: Product Deviation - ${deviationData.serialNumber} (Pending: ${deviationData.pendingWith})`;

    const color = isClosed ? '#10b981' : '#2563eb';
    const link = `http://localhost:5173/product-deviation/${deviationData.id || ''}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Product Deviation Alert</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${deviationData.serialNumber} - ${deviationData.status}</p>
        </div>
        <div style="padding: 20px;">
          <p>Hello,</p>
          <p style="margin: 0; color: #4b5563; font-size: 14px;">This is an automated notification regarding a Product Deviation.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid ${color}; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
            ${deviationData.submittedBy ? `<p style="margin: 0 0 8px 0; color: #1e293b; font-weight: 500;">Submitted By: <span style="color: #64748b; font-weight: 400;">${deviationData.submittedBy}</span></p>` : ''}
            <p style="margin: 0; color: #1e293b; font-weight: 500;">Pending Action With: <span style="color: ${color};">${deviationData.pendingWith}</span></p>
          </div>

          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Deviation Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 25%; background-color: #f1f5f9;">Serial Number</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; width: 25%;">${deviationData.serialNumber}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 25%; background-color: #f1f5f9;">Status</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; width: 25%; font-weight: bold; color: ${color};">${deviationData.status}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Line</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.line}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Creation Date</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.creationDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Start Date</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.startDate}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">End Date</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.endDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Quantity Produced</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.quantityProduced} sqm</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Quantity Under Deviation</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.quantityUnderDeviation} sqm</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Created By</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.createdBy}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Nature of Deviation</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.natureOfDeviation}</td>
            </tr>
          </table>

          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Description of Deviation</h3>
          <div style="background-color: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 25px;">
            ${deviationData.description}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Deviation Portal</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
            <p>This is an automated message from the DMS Portal. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `;

    return this.sendMail(recipientEmails, subject, html, "Deviation - DMS");
  }

  async sendProcessDeviationAlert(
    recipientEmails: string[],
    deviationData: {
      id: string;
      serialNumber: string;
      status: string;
      line: string;
      creationDate: string;
      startDate: string;
      endDate: string;
      parameterUnderDeviation: string;
      specificationOfParameter: string;
      createdBy: string;
      natureOfDeviation: string;
      description: string;
      pendingWith: string;
      submittedBy?: string;
    },
  ) {
    const isClosed = deviationData.status === 'CLOSED';
    const subject = isClosed
      ? `✅ Notification: Process Deviation Closed - ${deviationData.serialNumber}`
      : `⚠️ Action Required: Process Deviation - ${deviationData.serialNumber} (Pending: ${deviationData.pendingWith})`;

    const color = isClosed ? '#10b981' : '#f59e0b'; // Amber for process
    const link = `http://localhost:5173/process-deviation/${deviationData.id || ''}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Process Deviation Alert</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${deviationData.serialNumber} - ${deviationData.status}</p>
        </div>
        <div style="padding: 20px;">
          <p>Hello,</p>
          <p style="margin: 0; color: #4b5563; font-size: 14px;">This is an automated notification regarding a Process Deviation.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid ${color}; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
            ${deviationData.submittedBy ? `<p style="margin: 0 0 8px 0; color: #1e293b; font-weight: 500;">Submitted By: <span style="color: #64748b; font-weight: 400;">${deviationData.submittedBy}</span></p>` : ''}
            <p style="margin: 0; color: #1e293b; font-weight: 500;">Pending Action With: <span style="color: ${color};">${deviationData.pendingWith}</span></p>
          </div>

          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Deviation Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 25%; background-color: #f1f5f9;">Serial Number</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; width: 25%;">${deviationData.serialNumber}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 25%; background-color: #f1f5f9;">Status</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; width: 25%; font-weight: bold; color: ${color};">${deviationData.status}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Line</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.line}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Creation Date</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.creationDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Start Date</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.startDate}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">End Date</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.endDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Parameter Under Deviation</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.parameterUnderDeviation}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Specification of Parameter</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.specificationOfParameter}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Created By</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.createdBy}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">Nature of Deviation</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${deviationData.natureOfDeviation}</td>
            </tr>
          </table>

          <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Description of Deviation</h3>
          <div style="background-color: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 25px;">
            ${deviationData.description}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Deviation Portal</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
            <p>This is an automated message from the DMS Portal. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `;

    return this.sendMail(recipientEmails, subject, html, "Process Deviation - DMS");
  }
}
