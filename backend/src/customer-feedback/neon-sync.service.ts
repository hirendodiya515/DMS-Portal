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
    if (process.env.NEON_DATABASE_URL) {
      this.neonPool = new Pool({
        connectionString: process.env.NEON_DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
    }
  }

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
      return { synced: 0, cars: 0, errors: [msg] };
    }

    const client = await this.neonPool.connect();
    const errors: string[] = [];
    let synced = 0;
    let cars = 0;

    try {
      const feedbackResult = await client.query(`SELECT * FROM customer_feedback ORDER BY created_at ASC`);
      const neonFeedback = feedbackResult.rows;

      for (const row of neonFeedback) {
        try {
          await this.feedbackRepo
            .createQueryBuilder()
            .insert()
            .into(CustomerFeedback)
            .values({
              id: row.id,
              companyName: row.company_name,
              plantLocation: row.plant_location,
              officeLocation: row.office_location,
              annualCapacity: row.annual_capacity,
              contactPerson: row.contact_person,
              representativeName: row.representative_name,
              representativeMail: row.representative_mail,
              representativeDesignation: row.representative_designation,
              brlRepresentativeName: row.brl_representative_name,
              email: row.email,
              product: row.product,
              
              // Quality (Updated field names)
              thicknessDimensionQualityRating: row.thickness_dimension_quality_rating,
              thicknessDimensionQualityComment: row.thickness_dimension_quality_comment,
              surfaceVisualQualityRating: row.surface_visual_quality_rating,
              surfaceVisualQualityComment: row.surface_visual_quality_comment,
              breakagesRating: row.breakages_rating,
              breakagesComment: row.breakages_comment,
              edgeGrindingQualityRating: row.edge_grinding_quality_rating,
              edgeGrindingQualityComment: row.edge_grinding_quality_comment,
              arCoatingQualityRating: row.ar_coating_quality_rating,
              arCoatingQualityComment: row.ar_coating_quality_comment,
              packingLoadingQualityRating: row.packing_loading_quality_rating,
              packingLoadingQualityComment: row.packing_loading_quality_comment,
              powerOutputOfModulesRating: row.power_output_of_modules_rating,
              powerOutputOfModulesComment: row.power_output_of_modules_comment,
              solarGlassQualityRating: row.solar_glass_quality_rating,
              solarGlassQualityComment: row.solar_glass_quality_comment,
              energyGenerationPerformanceRating: row.energy_generation_performance_rating,
              energyGenerationPerformanceComment: row.energy_generation_performance_comment,
              technicalStandardsComplianceRating: row.technical_standards_compliance_rating,
              technicalStandardsComplianceComment: row.technical_standards_compliance_comment,
              qualityAverage: row.quality_average,

              // Competitiveness & Support (Updated field names)
              pricingRating: row.pricing_rating,
              pricingComment: row.pricing_comment,
              deliveryLeadTimeRating: row.delivery_lead_time_rating,
              deliveryLeadTimeComment: row.delivery_lead_time_comment,
              afterSalesServiceResponseRating: row.after_sales_service_response_rating,
              afterSalesServiceResponseComment: row.after_sales_service_response_comment,
              supportSatisfactionRating: row.support_satisfaction_rating,
              supportSatisfactionComment: row.support_satisfaction_comment,
              salesTeamApproachRating: row.sales_team_approach_rating,
              salesTeamApproachComment: row.sales_team_approach_comment,
              documentationAccuracyRating: row.documentation_accuracy_rating,
              documentationAccuracyComment: row.documentation_accuracy_comment,

              // Expectations
              solarGlassExpectationsRating: row.solar_glass_expectations_rating,
              solarGlassExpectationsComment: row.solar_glass_expectations_comment,
              futureUseLikelihoodRating: row.future_use_likelihood_rating,
              futureUseLikelihoodComment: row.future_use_likelihood_comment,

              // Insights
              procuredOtherThanBorosil: row.procured_other_than_borosil,
              procurementReason: row.procurement_reason,
              expectations: row.expectations,
              preferredChoice: row.preferred_choice,
              recommendation: row.recommendation,
              overallSatisfaction: row.overall_satisfaction,
              suggestion: row.suggestion,
              createdAt: row.created_at,
            })
            .orUpdate(
              [
                'company_name', 'plant_location', 'office_location', 'annual_capacity',
                'representative_name', 'representative_mail', 'representative_designation',
                'brl_representative_name'
              ],
              ['id']
            )
            .execute();

          synced++;
        } catch (err: any) {
          errors.push(`Feedback ${row.id}: ${err.message}`);
        }
      }

      // Sync CARs (mostly unchanged but ensures logic holds)
      const carsResult = await client.query(`SELECT * FROM corrective_action_requests ORDER BY created_at ASC`);
      for (const row of carsResult.rows) {
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

      return { synced, cars, errors };
    } finally {
      client.release();
    }
  }
}
