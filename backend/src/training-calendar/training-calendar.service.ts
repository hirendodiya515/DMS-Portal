import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { TrainingCalendar } from '../entities/training-calendar.entity';
import { TrainingAttendance } from '../entities/training-attendance.entity';
import { CreateTrainingCalendarDto, UpdateTrainingCalendarDto } from './dto/training-calendar.dto';

@Injectable()
export class TrainingCalendarService {
  constructor(
    @InjectRepository(TrainingCalendar)
    private calendarRepo: Repository<TrainingCalendar>,
    @InjectRepository(TrainingAttendance)
    private attendanceRepo: Repository<TrainingAttendance>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private get apiUrl() {
    return this.configService.get<string>('CLOUD_TRAINING_API_URL');
  }

  private get apiSecret() {
    return this.configService.get<string>('CLOUD_TRAINING_API_SECRET');
  }

  private get cloudBaseUrl() {
    return this.configService.get<string>('CLOUD_TRAINING_BASE_URL');
  }

  private cloudHeaders() {
    return { 'x-api-secret': this.apiSecret, 'Content-Type': 'application/json' };
  }

  // ── Create Training ────────────────────────────────────────────────────────
  async createTraining(dto: CreateTrainingCalendarDto) {
    const qrToken = uuidv4();

    // 1. Save to local DB
    const entity = this.calendarRepo.create({ ...dto, qrToken });
    const saved = await this.calendarRepo.save(entity);

    // 2. Push to Neon cloud
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ id: string }>(
          `${this.apiUrl}/trainings`,
          {
            dms_training_id: saved.id,
            training_name: saved.trainingName,
            training_date: saved.trainingDate,
            location: saved.location,
            start_time: saved.startTime,
            end_time: saved.endTime,
            qr_token: qrToken,
          },
          { headers: this.cloudHeaders() }
        )
      );
      // Save cloud ID back
      saved.cloudTrainingId = response.data?.id;
      await this.calendarRepo.save(saved);
    } catch (err) {
      console.error('Failed to push training to cloud:', (err as Error).message);
      // Don't fail — training was saved locally; cloud push can be retried
    }

    // 3. Generate QR Code pointing to the cloud Vercel URL
    const qrUrl = `${this.cloudBaseUrl}/attend/${qrToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    });

    return { ...saved, qrUrl, qrCodeDataUrl };
  }

  // ── Get All Trainings ──────────────────────────────────────────────────────
  async getAllTrainings() {
    return this.calendarRepo.find({ order: { trainingDate: 'DESC' } });
  }

  // ── Get Training by ID ─────────────────────────────────────────────────────
  async getTrainingById(id: string) {
    const training = await this.calendarRepo.findOne({ where: { id } });
    if (!training) throw new NotFoundException('Training not found');
    return training;
  }

  // ── Get QR Code for existing training ─────────────────────────────────────
  async getQrCode(id: string) {
    const training = await this.getTrainingById(id);
    const qrUrl = `${this.cloudBaseUrl}/attend/${training.qrToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    });
    return { qrUrl, qrCodeDataUrl };
  }

  // ── Update Training ────────────────────────────────────────────────────────
  async updateTraining(id: string, dto: UpdateTrainingCalendarDto) {
    const training = await this.getTrainingById(id);
    Object.assign(training, dto);
    return this.calendarRepo.save(training);
  }

  // ── Delete Training ────────────────────────────────────────────────────────
  async deleteTraining(id: string) {
    const result = await this.calendarRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Training not found');
    return { message: 'Training deleted successfully' };
  }

  // ── Get Attendance for a Training ──────────────────────────────────────────
  async getAttendanceByTraining(trainingId: string) {
    return this.attendanceRepo.find({
      where: { trainingId },
      order: { markedAt: 'DESC' },
    });
  }

  // ── Midnight Sync Cron Job ─────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncAttendanceFromCloud() {
    console.log('[TrainingSync] Starting midnight attendance sync...');
    try {
      // Fetch unsynced records from cloud
      const response = await firstValueFrom(
        this.httpService.get<{
          id: string;
          training_id: string;
          employee_id: string;
          employee_name: string;
          marked_at: string;
          ip_address: string;
          dms_training_id: string;
        }[]>(`${this.apiUrl}/attendance?synced=false`, {
          headers: this.cloudHeaders(),
        })
      );

      const cloudRecords: {
        id: string;
        training_id: string;
        employee_id: string;
        employee_name: string;
        marked_at: string;
        ip_address: string;
        dms_training_id: string;
      }[] = response.data;
      
      if (!cloudRecords.length) {
        console.log('[TrainingSync] No new attendance records to sync.');
        return;
      }

      const syncedIds: string[] = [];

      for (const record of cloudRecords) {
        try {
          // Find matching local training by DMS ID
          const localTraining = await this.calendarRepo.findOne({
            where: { id: record.dms_training_id },
          });

          if (!localTraining) {
            console.warn(`[TrainingSync] Local training not found for dms_id: ${record.dms_training_id}`);
            continue;
          }

          // Check if already synced (avoid duplicates)
          const existing = await this.attendanceRepo.findOne({
            where: { cloudAttendanceId: record.id },
          });
          if (existing) continue;

          // Save to local
          const attendance = this.attendanceRepo.create({
            trainingId: localTraining.id,
            employeeId: record.employee_id,
            employeeName: record.employee_name,
            ipAddress: record.ip_address,
            cloudAttendanceId: record.id,
            syncedFromCloud: true,
          });
          await this.attendanceRepo.save(attendance);
          syncedIds.push(record.id);
        } catch (err) {
          console.error(`[TrainingSync] Error processing record ${record.id}:`, err);
        }
      }

      // Mark as synced on cloud
      if (syncedIds.length > 0) {
        await firstValueFrom(
          this.httpService.patch(
            `${this.apiUrl}/attendance/mark-synced`,
            { ids: syncedIds },
            { headers: this.cloudHeaders() }
          )
        );
        console.log(`[TrainingSync] Synced ${syncedIds.length} attendance records.`);
      }
    } catch (err) {
      console.error('[TrainingSync] Sync failed:', err);
    }
  }

  // ── Manual Sync Trigger ────────────────────────────────────────────────────
  async triggerSync() {
    await this.syncAttendanceFromCloud();
    return { message: 'Sync triggered successfully' };
  }
}
