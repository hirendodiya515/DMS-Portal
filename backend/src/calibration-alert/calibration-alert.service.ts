import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Equipment, CalibrationStatus } from '../entities/equipment.entity';
import { User, UserRole } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class CalibrationAlertService {
  private readonly logger = new Logger(CalibrationAlertService.name);

  constructor(
    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private mailService: MailService,
  ) {}

  // Cron job at 9:30 AM every day
  @Cron('0 30 9 * * *')
  async handleCron() {
    this.logger.log('Running daily calibration alert check...');
    await this.checkAndSendAlerts();
  }

  async checkAndSendAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEquipment = await this.equipmentRepository.find({
      relations: ['createdBy'],
    });

    for (const equipment of allEquipment) {
      const status = equipment.getCalibrationStatus();
      
      // We only care about UPCOMING and DUE statuses for alerts
      if (status === CalibrationStatus.OK) {
        // Reset lastAlertStatus if it was previously set and is now OK (e.g. after calibration)
        if (equipment.lastAlertStatus !== 'ok') {
          equipment.lastAlertStatus = 'ok';
          await this.equipmentRepository.save(equipment);
        }
        continue;
      }

      // Check if we already sent an alert for this status today
      const alreadySentToday = 
        equipment.lastAlertSentAt && 
        new Date(equipment.lastAlertSentAt).toDateString() === today.toDateString() &&
        equipment.lastAlertStatus === status;

      if (alreadySentToday) {
        continue;
      }

      await this.sendAlertForEquipment(equipment, status);
    }
  }

  private async sendAlertForEquipment(equipment: Equipment, status: CalibrationStatus) {
    try {
      const department = equipment.department;
      this.logger.debug(`Processing alerts for ${equipment.equipmentNumber} (${equipment.name}) in ${department}`);

      // 1. Identify Recipients by Category
      
      // Find Creator
      const creator = await this.userRepository.findOne({ where: { id: equipment.createdById } });
      
      // Find Department Creator, Reviewers & HODs (Case-insensitive department search)
      const deptUsers = await this.userRepository.createQueryBuilder('user')
        .where('LOWER(user.department) = LOWER(:dept)', { dept: department })
        .andWhere('user.role IN (:...roles)', { roles: [UserRole.CREATOR, UserRole.REVIEWER, UserRole.DEPT_HEAD] })
        .getMany();

      // Combine and label for logging
      const recipientMap = new Map<string, { user: User, roles: string[] }>();

      const addRecipient = (user: User, roleLabel: string) => {
        if (!user.email || user.email === 'admin@dms.com') return; // Skip invalid/excluded emails
        
        const existing = recipientMap.get(user.id);
        if (existing) {
          if (!existing.roles.includes(roleLabel)) {
            existing.roles.push(roleLabel);
          }
        } else {
          recipientMap.set(user.id, { user, roles: [roleLabel] });
        }
      };

      if (creator) addRecipient(creator, 'Specific Creator');
      deptUsers.forEach(u => {
        let roleLabel = 'Reviewer';
        if (u.role === UserRole.DEPT_HEAD) roleLabel = 'HOD';
        else if (u.role === UserRole.CREATOR) roleLabel = 'Creator Role';
        
        addRecipient(u, roleLabel);
      });

      if (recipientMap.size === 0) {
        this.logger.warn(`No valid recipients found for equipment ${equipment.equipmentNumber}`);
        return;
      }

      // 2. Send Email and In-App Notifications
      const recipientEmails = Array.from(recipientMap.values()).map(r => r.user.email);
      const recipientRoles = Array.from(recipientMap.values()).map(r => `${r.user.firstName} (${r.roles.join('+')})`);

      try {
        // Send Consolidated Email
        await this.mailService.sendCalibrationAlert(recipientEmails, {
          equipmentName: equipment.name,
          equipmentNumber: equipment.equipmentNumber,
          nextCalibrationDate: new Date(equipment.nextCalibrationDate).toLocaleDateString(),
          status: status === CalibrationStatus.DUE ? 'DUE' : 'UPCOMING',
          department: equipment.department,
        });

        // Create In-App Notifications for each user
        const notifications = Array.from(recipientMap.keys()).map(userId => {
          return this.notificationRepository.create({
            userId: userId,
            message: `Calibration ${status === CalibrationStatus.DUE ? 'OVERDUE' : 'UPCOMING'} for equipment: ${equipment.equipmentNumber} (${equipment.name})`,
            isRead: false,
          });
        });
        await this.notificationRepository.save(notifications);

        this.logger.log(`[Alert Sent] Eq: ${equipment.equipmentNumber} | Recipients: ${recipientEmails.join(', ')} | Details: ${recipientRoles.join(', ')}`);
      } catch (error) {
        this.logger.error(`Failed to send consolidated alert for ${equipment.equipmentNumber}: ${error.message}`);
      }

      // 3. Update Equipment tracking fields
      equipment.lastAlertSentAt = new Date();
      equipment.lastAlertStatus = status;
      await this.equipmentRepository.save(equipment);

    } catch (error) {
      this.logger.error(`Critical error in sendAlertForEquipment for ${equipment.equipmentNumber}: ${error.message}`);
    }
  }
}
