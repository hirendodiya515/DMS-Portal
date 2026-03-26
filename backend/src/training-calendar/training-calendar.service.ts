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
import { AnnualTrainingPlan } from '../entities/annual-training-plan.entity';
import { CreateTrainingCalendarDto, UpdateTrainingCalendarDto } from './dto/training-calendar.dto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class TrainingCalendarService {
  constructor(
    @InjectRepository(TrainingCalendar)
    private calendarRepo: Repository<TrainingCalendar>,
    @InjectRepository(TrainingAttendance)
    private attendanceRepo: Repository<TrainingAttendance>,
    @InjectRepository(AnnualTrainingPlan)
    private planRepo: Repository<AnnualTrainingPlan>,
    private httpService: HttpService,
    private configService: ConfigService,
    private settingsService: SettingsService,
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

    // Fetch existing departments setup in DMS to sync to the Cloud Portal
    const departments = await this.settingsService.getSetting('departments') || [];

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
            departments,
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
    return await this.calendarRepo.find({ order: { trainingDate: 'DESC' } });
  }

  // ── Annual Training Plans ──────────────────────────────────────────────────
  async getAnnualPlans() {
    return await this.planRepo.find({ order: { year: 'ASC', month: 'ASC' } });
  }

  async createAnnualPlan(dto: { topic: string; month: number; year: number; department?: string }) {
    const plan = this.planRepo.create(dto);
    return await this.planRepo.save(plan);
  }

  async deleteAnnualPlan(id: string) {
    const res = await this.planRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException('Plan not found');
    return { success: true };
  }

  // ── Get Single & QR ────────────────────────────────────────────────────────
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

  // ── Get Analytics for a Training ───────────────────────────────────────────
  async getAnalyticsByTraining(trainingId: string) {
    const attendance = await this.getAttendanceByTraining(trainingId);
    
    // Filter records that actually have feedback submitted
    const feedbackRecords = attendance.filter(a => a.feedback != null && typeof a.feedback === 'object');
    const totalAttendees = attendance.length;
    const totalFeedback = feedbackRecords.length;

    if (totalFeedback === 0) {
      return { totalAttendees, totalFeedback, hasData: false };
    }

    // Averages (1-5 range)
    let sumPresentation = 0, sumMaterial = 0, sumFacilitator = 0, sumOverall = 0;
    
    // Booleans
    let awareYes = 0, awareNo = 0;
    let recommendYes = 0, recommendNo = 0;

    // Text Lists
    const ideas: { name: string; text: string }[] = [];
    const suggestions: { name: string; text: string }[] = [];

    feedbackRecords.forEach(a => {
      const fb = a.feedback;
      // Stars
      if (typeof fb.q2_presentation === 'number') sumPresentation += fb.q2_presentation;
      if (typeof fb.q3_material === 'number') sumMaterial += fb.q3_material;
      if (typeof fb.q4_facilitator === 'number') sumFacilitator += fb.q4_facilitator;
      if (typeof fb.q5_overall === 'number') sumOverall += fb.q5_overall;

      // Booleans
      if (fb.q1_aware_objective === true) awareYes++;
      if (fb.q1_aware_objective === false) awareNo++;
      
      if (fb.q6_recommend === true) recommendYes++;
      if (fb.q6_recommend === false) recommendNo++;

      // Texts
      if (fb.q7_ideas && fb.q7_ideas.trim().length > 0) {
        ideas.push({ name: a.employeeName, text: fb.q7_ideas.trim() });
      }
      if (fb.q8_suggestions && fb.q8_suggestions.trim().length > 0) {
        suggestions.push({ name: a.employeeName, text: fb.q8_suggestions.trim() });
      }
    });

    return {
      hasData: true,
      totalAttendees,
      totalFeedback,
      averages: {
        presentation: (sumPresentation / totalFeedback).toFixed(1),
        material: (sumMaterial / totalFeedback).toFixed(1),
        facilitator: (sumFacilitator / totalFeedback).toFixed(1),
        overall: (sumOverall / totalFeedback).toFixed(1),
      },
      counts: {
        aware: { yes: awareYes, no: awareNo },
        recommend: { yes: recommendYes, no: recommendNo },
      },
      ideas,
      suggestions,
    };
  }

  // ── Get Aggregate Analytics for Multiple Trainings ─────────────────────────
  async getAggregateAnalytics(startDate?: string, endDate?: string, department?: string) {
    // Determine which trainings match the date filter
    const query = this.calendarRepo.createQueryBuilder('training');
    if (startDate) {
      query.andWhere('training.trainingDate >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('training.trainingDate <= :endDate', { endDate });
    }
    if (department && department !== 'All') {
      query.andWhere('(training.department = :dept OR training.department = :all)', { dept: department, all: 'All' });
    }
    
    const trainings = await query.getMany();
    const trainingIds = trainings.map(t => t.id);

    if (trainingIds.length === 0) {
      return { totalAttendees: 0, totalFeedback: 0, hasData: false };
    }

    // Get all attendance for these trainings
    const attendanceQuery = this.attendanceRepo.createQueryBuilder('attendance')
      .where('attendance.trainingId IN (:...trainingIds)', { trainingIds });
    
    if (department && department !== 'All') {
      attendanceQuery.andWhere('attendance.department = :dept', { dept: department });
    }

    const attendance = await attendanceQuery.getMany();

    // Now run the exact same aggregation logic
    const feedbackRecords = attendance.filter(a => a.feedback != null && typeof a.feedback === 'object');
    const totalAttendees = attendance.length;
    const totalFeedback = feedbackRecords.length;

    if (totalFeedback === 0) {
      return { totalAttendees, totalFeedback, hasData: false };
    }

    let sumPresentation = 0, sumMaterial = 0, sumFacilitator = 0, sumOverall = 0;
    let awareYes = 0, awareNo = 0;
    let recommendYes = 0, recommendNo = 0;
    const ideas: { name: string; text: string }[] = [];
    const suggestions: { name: string; text: string }[] = [];

    feedbackRecords.forEach(a => {
      const fb = a.feedback;
      if (typeof fb.q2_presentation === 'number') sumPresentation += fb.q2_presentation;
      if (typeof fb.q3_material === 'number') sumMaterial += fb.q3_material;
      if (typeof fb.q4_facilitator === 'number') sumFacilitator += fb.q4_facilitator;
      if (typeof fb.q5_overall === 'number') sumOverall += fb.q5_overall;

      if (fb.q1_aware_objective === true) awareYes++;
      if (fb.q1_aware_objective === false) awareNo++;
      
      if (fb.q6_recommend === true) recommendYes++;
      if (fb.q6_recommend === false) recommendNo++;

      if (fb.q7_ideas && fb.q7_ideas.trim().length > 0) {
        ideas.push({ name: a.employeeName, text: fb.q7_ideas.trim() });
      }
      if (fb.q8_suggestions && fb.q8_suggestions.trim().length > 0) {
        suggestions.push({ name: a.employeeName, text: fb.q8_suggestions.trim() });
      }
    });

    return {
      hasData: true,
      totalAttendees,
      totalFeedback,
      averages: {
        presentation: (sumPresentation / totalFeedback).toFixed(1),
        material: (sumMaterial / totalFeedback).toFixed(1),
        facilitator: (sumFacilitator / totalFeedback).toFixed(1),
        overall: (sumOverall / totalFeedback).toFixed(1),
      },
      counts: {
        aware: { yes: awareYes, no: awareNo },
        recommend: { yes: recommendYes, no: recommendNo },
      },
      ideas,
      suggestions,
    };
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
          feedback?: any;
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
        feedback?: any;
        department?: string;
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
            feedback: record.feedback,
            department: record.department,
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
