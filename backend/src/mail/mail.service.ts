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

  async sendMail(to: string | string[], subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Equipment management - DMS" <${this.configService.get<string>('MAIL_FROM')}>`,
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
}
