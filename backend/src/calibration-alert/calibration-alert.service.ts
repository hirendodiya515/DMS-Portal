import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Equipment, CalibrationStatus } from '../entities/equipment.entity';
import { User, UserRole } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { MailService } from '../mail/mail.service';

function formatDate(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

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

    const groups = new Map<string, { department: string; status: CalibrationStatus; equipments: Equipment[] }>();

    for (const equipment of allEquipment) {
      const status = equipment.getCalibrationStatus();
      
      // Skip equipment under maintenance or inactive
      if (status === CalibrationStatus.INACTIVE) {
        continue;
      }

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

      // Group by department and status
      const key = `${equipment.department.toLowerCase()}__${status}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          department: equipment.department,
          status,
          equipments: [],
        };
        groups.set(key, group);
      }
      group.equipments.push(equipment);
    }

    // Process and send consolidated alerts
    for (const group of groups.values()) {
      await this.sendConsolidatedAlert(group.department, group.status, group.equipments);
    }
  }

  private async sendConsolidatedAlert(department: string, status: CalibrationStatus, equipments: Equipment[]) {
    try {
      this.logger.debug(`Processing consolidated alerts for ${equipments.length} equipment in ${department} (${status})`);

      // 1. Identify Recipients by Category
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

      // Add all creators of the specific equipment in this group
      for (const eq of equipments) {
        if (eq.createdBy) {
          addRecipient(eq.createdBy, 'Specific Creator');
        } else {
          const creator = await this.userRepository.findOne({ where: { id: eq.createdById } });
          if (creator) {
            addRecipient(creator, 'Specific Creator');
          }
        }
      }

      // Find Department Creator, Reviewers & HODs (Case-insensitive department search)
      const deptUsers = await this.userRepository.createQueryBuilder('user')
        .where('LOWER(user.department) = LOWER(:dept)', { dept: department })
        .andWhere('user.role IN (:...roles)', { roles: [UserRole.CREATOR, UserRole.REVIEWER, UserRole.DEPT_HEAD] })
        .getMany();

      deptUsers.forEach(u => {
        let roleLabel = 'Reviewer';
        if (u.role === UserRole.DEPT_HEAD) roleLabel = 'HOD';
        else if (u.role === UserRole.CREATOR) roleLabel = 'Creator Role';
        
        addRecipient(u, roleLabel);
      });

      if (recipientMap.size === 0) {
        this.logger.warn(`No valid recipients found for department ${department}`);
        return;
      }

      // 2. Send Email and In-App Notifications
      const recipientEmails = Array.from(recipientMap.values()).map(r => r.user.email);

      try {
        // Send Consolidated Email
        await this.mailService.sendConsolidatedCalibrationAlert(recipientEmails, {
          status: status === CalibrationStatus.DUE ? 'DUE' : 'UPCOMING',
          department: department,
          equipments: equipments.map(eq => ({
            name: eq.name,
            equipmentNumber: eq.equipmentNumber,
            nextCalibrationDate: formatDate(eq.nextCalibrationDate),
          })),
        });

        // Create In-App Notifications for each user and equipment
        const notifications: Notification[] = [];
        for (const eq of equipments) {
          for (const userId of recipientMap.keys()) {
            notifications.push(
              this.notificationRepository.create({
                userId: userId,
                message: `Calibration ${status === CalibrationStatus.DUE ? 'OVERDUE' : 'UPCOMING'} for equipment: ${eq.equipmentNumber} (${eq.name})`,
                isRead: false,
              })
            );
          }
        }
        if (notifications.length > 0) {
          await this.notificationRepository.save(notifications);
        }

        this.logger.log(`[Consolidated Alert Sent] Dept: ${department} | Status: ${status} | Count: ${equipments.length} | Recipients: ${recipientEmails.join(', ')}`);
      } catch (error) {
        this.logger.error(`Failed to send consolidated alert for department ${department}: ${error.message}`);
      }

      // 3. Update Equipment tracking fields
      for (const eq of equipments) {
        eq.lastAlertSentAt = new Date();
        eq.lastAlertStatus = status;
        await this.equipmentRepository.save(eq);
      }

    } catch (error) {
      this.logger.error(`Critical error in sendConsolidatedAlert for department ${department}: ${error.message}`);
    }
  }
}
