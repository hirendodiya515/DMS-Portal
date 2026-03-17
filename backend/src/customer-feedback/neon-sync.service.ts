import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool } from 'pg';
import { CustomerFeedback } from '../entities/customer-feedback.entity';
import { CorrectiveActionRequest } from '../entities/corrective-action-request.entity';

@Injectable()
export class NeonSyncService {
  private readonly logger = new Logger(NeonSyncService.name);
  private neonPool: Pool;

  constructor(
    @InjectRepository(CustomerFeedback)
    private readonly feedbackRepo: Repository<CustomerFeedback>,
    @InjectRepository(CorrectiveActionRequest)
    private readonly carRepo: Repository<CorrectiveActionRequest>,
  ) {
    // Only create pool if NEON_DATABASE_URL is set
    if (process.env.NEON_DATABASE_URL) {
      this.neonPool = new Pool({
        connectionString: process.env.NEON_DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
    }
  }

  // Runs at midnight every night
  @Cron('0 0 * * *')
  async scheduledSync() {
    this.logger.log('Starting nightly sync from NeonDB...');
    return this.runSync();
  }

  // Manual trigger — callable via API endpoint
  async manualSync() {
    this.logger.log('Manual sync triggered from admin dashboard...');
    return this.runSync();
  }

  async runSync(): Promise<{ synced: number; cars: number; errors: string[] }> {
    if (!this.neonPool) {
      const msg = 'NEON_DATABASE_URL not configured. Skipping sync.';
      this.logger.warn(msg);
      return { synced: 0, cars: 0, errors: [msg] };
    }

    const client = await this.neonPool.connect();
    const errors: string[] = [];
    let synced = 0;
    let cars = 0;

    try {
      // Fetch all feedback from NeonDB
      const feedbackResult = await client.query(
        `SELECT * FROM customer_feedback ORDER BY created_at ASC`
      );
      const neonFeedback = feedbackResult.rows;
      this.logger.log(`Found ${neonFeedback.length} records in NeonDB`);

      for (const row of neonFeedback) {
        try {
          // Upsert to local PostgreSQL (skip if already exists by id)
          await this.feedbackRepo
            .createQueryBuilder()
            .insert()
            .into(CustomerFeedback)
            .values({
              id: row.id,
              companyName: row.company_name,
              contactPerson: row.contact_person,
              email: row.email,
              product: row.product,
              qualityRating: row.quality_rating,
              deliveryRating: row.delivery_rating,
              packagingRating: row.packaging_rating,
              supportRating: row.support_rating,
              responseRating: row.response_rating,
              complaintRating: row.complaint_rating,
              documentationRating: row.documentation_rating,
              overallRating: row.overall_rating,
              recommendation: row.recommendation,
              suggestion: row.suggestion,
              createdAt: row.created_at,
            })
            .orIgnore() // Skip if ID already exists (idempotent)
            .execute();

          synced++;
        } catch (err: any) {
          errors.push(`Feedback ${row.id}: ${err.message}`);
        }
      }

      // Fetch all CARs from NeonDB
      const carsResult = await client.query(
        `SELECT * FROM corrective_action_requests ORDER BY created_at ASC`
      );
      const neonCars = carsResult.rows;

      for (const row of neonCars) {
        try {
          await this.carRepo
            .createQueryBuilder()
            .insert()
            .into(CorrectiveActionRequest)
            .values({
              id: row.id,
              feedbackId: row.feedback_id,
              customerName: row.customer_name,
              issueDescription: row.issue_description,
              score: row.score,
              actionOwner: row.action_owner,
              deadline: row.deadline,
              status: row.status,
              createdAt: row.created_at,
            })
            .orIgnore()
            .execute();

          cars++;
        } catch (err: any) {
          errors.push(`CAR ${row.id}: ${err.message}`);
        }
      }

      this.logger.log(`Sync complete: ${synced} feedback, ${cars} CARs synced.`);
      return { synced, cars, errors };

    } catch (error: any) {
      this.logger.error('Sync failed:', error.message);
      return { synced, cars, errors: [error.message] };
    } finally {
      client.release();
    }
  }
}
