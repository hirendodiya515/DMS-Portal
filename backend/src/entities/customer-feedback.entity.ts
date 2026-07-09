import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { CorrectiveActionRequest } from './corrective-action-request.entity';

@Entity('customer_feedback')
export class CustomerFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Basic Information
  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  companyName: string;

  @Column({ name: 'plant_location', type: 'varchar', length: 255, nullable: true })
  plantLocation: string;

  @Column({ name: 'office_location', type: 'varchar', length: 255, nullable: true })
  officeLocation: string;

  @Column({ name: 'annual_capacity', type: 'varchar', length: 255, nullable: true })
  annualCapacity: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 255 })
  contactPerson: string;

  @Column({ name: 'representative_name', type: 'varchar', length: 255, nullable: true })
  representativeName: string;

  @Column({ name: 'representative_mail', type: 'varchar', length: 255, nullable: true })
  representativeMail: string;

  @Column({ name: 'representative_designation', type: 'varchar', length: 255, nullable: true })
  representativeDesignation: string;

  @Column({ name: 'brl_representative_name', type: 'varchar', length: 255, nullable: true })
  brlRepresentativeName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  product: string;

  // Quality Ratings & Comments (Updated)
  @Column({ name: 'quality_rating', type: 'int', default: 0 })
  qualityRating: number;

  @Column({ name: 'thickness_dimension_quality_rating', type: 'int', default: 0 })
  thicknessDimensionQualityRating: number;
  @Column({ name: 'thickness_dimension_quality_comment', type: 'text', nullable: true })
  thicknessDimensionQualityComment: string;

  @Column({ name: 'surface_visual_quality_rating', type: 'int', default: 0 })
  surfaceVisualQualityRating: number;
  @Column({ name: 'surface_visual_quality_comment', type: 'text', nullable: true })
  surfaceVisualQualityComment: string;

  @Column({ name: 'breakages_rating', type: 'int', default: 0 })
  breakagesRating: number;
  @Column({ name: 'breakages_comment', type: 'text', nullable: true })
  breakagesComment: string;

  @Column({ name: 'edge_grinding_quality_rating', type: 'int', default: 0 })
  edgeGrindingQualityRating: number;
  @Column({ name: 'edge_grinding_quality_comment', type: 'text', nullable: true })
  edgeGrindingQualityComment: string;

  @Column({ name: 'ar_coating_quality_rating', type: 'int', default: 0 })
  arCoatingQualityRating: number;
  @Column({ name: 'ar_coating_quality_comment', type: 'text', nullable: true })
  arCoatingQualityComment: string;

  @Column({ name: 'packing_loading_quality_rating', type: 'int', default: 0 })
  packingLoadingQualityRating: number;
  @Column({ name: 'packing_loading_quality_comment', type: 'text', nullable: true })
  packingLoadingQualityComment: string;

  @Column({ name: 'solar_glass_quality_rating', type: 'int', default: 0 })
  solarGlassQualityRating: number;
  @Column({ name: 'solar_glass_quality_comment', type: 'text', nullable: true })
  solarGlassQualityComment: string;

  @Column({ name: 'energy_generation_performance_rating', type: 'int', default: 0 })
  energyGenerationPerformanceRating: number;
  @Column({ name: 'energy_generation_performance_comment', type: 'text', nullable: true })
  energyGenerationPerformanceComment: string;

  @Column({ name: 'technical_standards_compliance_rating', type: 'int', default: 0 })
  technicalStandardsComplianceRating: number;
  @Column({ name: 'technical_standards_compliance_comment', type: 'text', nullable: true })
  technicalStandardsComplianceComment: string;

  // Competitiveness Ratings & Comments
  @Column({ name: 'pricing_rating', type: 'int', default: 0 })
  pricingRating: number;
  @Column({ name: 'pricing_comment', type: 'text', nullable: true })
  pricingComment: string;

  @Column({ name: 'delivery_lead_time_rating', type: 'int', default: 0 })
  deliveryLeadTimeRating: number;
  @Column({ name: 'delivery_lead_time_comment', type: 'text', nullable: true })
  deliveryLeadTimeComment: string;

  @Column({ name: 'after_sales_service_response_rating', type: 'int', default: 0 })
  afterSalesServiceResponseRating: number;
  @Column({ name: 'after_sales_service_response_comment', type: 'text', nullable: true })
  afterSalesServiceResponseComment: string;

  @Column({ name: 'support_satisfaction_rating', type: 'int', default: 0 })
  supportSatisfactionRating: number;
  @Column({ name: 'support_satisfaction_comment', type: 'text', nullable: true })
  supportSatisfactionComment: string;

  @Column({ name: 'sales_team_approach_rating', type: 'int', default: 0 })
  salesTeamApproachRating: number;
  @Column({ name: 'sales_team_approach_comment', type: 'text', nullable: true })
  salesTeamApproachComment: string;

  @Column({ name: 'documentation_accuracy_rating', type: 'int', default: 0 })
  documentationAccuracyRating: number;
  @Column({ name: 'documentation_accuracy_comment', type: 'text', nullable: true })
  documentationAccuracyComment: string;

  @Column({ name: 'quality_average', type: 'varchar', length: 10, nullable: true })
  qualityAverage: string;

  @Column({ name: 'solar_glass_expectations_rating', type: 'int', default: 0 })
  solarGlassExpectationsRating: number;
  @Column({ name: 'solar_glass_expectations_comment', type: 'text', nullable: true })
  solarGlassExpectationsComment: string;

  @Column({ name: 'future_use_likelihood_rating', type: 'int', default: 0 })
  futureUseLikelihoodRating: number;
  @Column({ name: 'future_use_likelihood_comment', type: 'text', nullable: true })
  futureUseLikelihoodComment: string;

  // Insights & Satisfaction
  @Column({ name: 'procured_other_than_borosil', type: 'varchar', length: 10, nullable: true })
  procuredOtherThanBorosil: string;

  @Column({ name: 'procurement_reason', type: 'text', nullable: true })
  procurementReason: string;

  @Column({ type: 'text', nullable: true })
  expectations: string;

  @Column({ name: 'preferred_choice', type: 'jsonb', nullable: true })
  preferredChoice: any;

  @Column({ name: 'recommendation', type: 'varchar', length: 50, nullable: true })
  recommendation: string;

  @Column({ name: 'overall_satisfaction', type: 'varchar', length: 50, nullable: true })
  overallSatisfaction: string;

  @Column({ type: 'text', nullable: true })
  suggestion: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => CorrectiveActionRequest, car => car.feedback)
  cars: CorrectiveActionRequest[];
}
