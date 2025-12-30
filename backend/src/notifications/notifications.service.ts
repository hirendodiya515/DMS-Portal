import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
    ) {}

    async create(userId: string, message: string, documentId?: string) {
        const notification = this.notificationRepository.create({
            userId,
            message,
            documentId,
        });
        return this.notificationRepository.save(notification);
    }

    async findAllForUser(userId: string) {
        return this.notificationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 20,
        });
    }

    async markAsRead(id: string, userId: string) {
        await this.notificationRepository.update({ id, userId }, { isRead: true });
        return { message: 'Notification marked as read' };
    }

    async markAllAsRead(userId: string) {
        await this.notificationRepository.update({ userId, isRead: false }, { isRead: true });
        return { message: 'All notifications marked as read' };
    }
}
