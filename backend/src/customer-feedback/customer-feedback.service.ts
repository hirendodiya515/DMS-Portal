import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerFeedback } from '../entities/customer-feedback.entity';
import { CorrectiveActionRequest } from '../entities/corrective-action-request.entity';

@Injectable()
export class CustomerFeedbackService {
  constructor(
    @InjectRepository(CustomerFeedback)
    private readonly feedbackRepo: Repository<CustomerFeedback>,
    @InjectRepository(CorrectiveActionRequest)
    private readonly carRepo: Repository<CorrectiveActionRequest>,
  ) {}

  async findAll() {
    return this.feedbackRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['cars'],
    });
  }

  async createFeedback(payload: any) {
    const { basicInfo, quality, competitiveness, others, overallSatisfaction, suggestion, qualityAverage } = payload;

    // Map nested UI structure to flat Entity structure (Updated)
    const feedbackData: Partial<CustomerFeedback> = {
      // Basic Info
      companyName: basicInfo.customerName,
      plantLocation: basicInfo.plantLocation,
      officeLocation: basicInfo.officeLocation,
      annualCapacity: basicInfo.annualCapacity,
      contactPerson: basicInfo.representativeName,
      representativeName: basicInfo.representativeName,
      representativeMail: basicInfo.representativeMail,
      email: basicInfo.representativeMail,
      representativeDesignation: basicInfo.representativeDesignation,
      brlRepresentativeName: basicInfo.brlRepresentativeName || null,
      
      // Quality Section (Updated field names)
      thicknessDimensionQualityRating: quality.thicknessDimensionQuality.rating,
      thicknessDimensionQualityComment: quality.thicknessDimensionQuality.comment,
      surfaceVisualQualityRating: quality.surfaceVisualQuality.rating,
      surfaceVisualQualityComment: quality.surfaceVisualQuality.comment,
      breakagesRating: quality.breakages.rating,
      breakagesComment: quality.breakages.comment,
      edgeGrindingQualityRating: quality.edgeGrindingQuality.rating,
      edgeGrindingQualityComment: quality.edgeGrindingQuality.comment,
      arCoatingQualityRating: quality.arCoatingQuality.rating,
      arCoatingQualityComment: quality.arCoatingQuality.comment,
      packingLoadingQualityRating: quality.packingLoadingQuality.rating,
      packingLoadingQualityComment: quality.packingLoadingQuality.comment,
      qualityAverage: qualityAverage,

      // Competitiveness Section (Updated field name)
      pricingRating: competitiveness.pricing.rating,
      pricingComment: competitiveness.pricing.comment,
      deliveryLeadTimeRating: competitiveness.deliveryLeadTime.rating,
      deliveryLeadTimeComment: competitiveness.deliveryLeadTime.comment,
      afterSalesServiceResponseRating: competitiveness.afterSalesServiceResponse.rating,
      afterSalesServiceResponseComment: competitiveness.afterSalesServiceResponse.comment,
      salesTeamApproachRating: competitiveness.salesTeamApproach.rating,
      salesTeamApproachComment: competitiveness.salesTeamApproach.comment,

      // Others & Satisfaction
      procuredOtherThanBorosil: others.procuredOtherThanBorosil,
      procurementReason: others.procurementReason,
      expectations: others.expectations,
      preferredChoice: others.preferredChoice,
      recommendation: others.recommendation,
      overallSatisfaction: overallSatisfaction,
      suggestion: suggestion,
    };

    const feedback = this.feedbackRepo.create(feedbackData);
    const savedFeedback = await this.feedbackRepo.save(feedback);

    // Automation: Auto-generate CARs for any low scores (<= 2) in all rated categories (Updated)
    const allRatings = [
      { label: 'Thickness & Dimension', score: quality.thicknessDimensionQuality.rating },
      { label: 'Surface & Visual', score: quality.surfaceVisualQuality.rating },
      { label: 'Breakages', score: quality.breakages.rating },
      { label: 'Edge Grinding', score: quality.edgeGrindingQuality.rating },
      { label: 'Coating', score: quality.arCoatingQuality.rating },
      { label: 'Packing & Loading', score: quality.packingLoadingQuality.rating },
      { label: 'Pricing', score: competitiveness.pricing.rating },
      { label: 'Delivery & Lead Time', score: competitiveness.deliveryLeadTime.rating },
      { label: 'After Sales Service', score: competitiveness.afterSalesServiceResponse.rating },
      { label: 'Sales Team Approach', score: competitiveness.salesTeamApproach.rating },
    ];

    for (const item of allRatings) {
      if (item.score > 0 && item.score <= 2) {
        const car = this.carRepo.create({
          feedbackId: savedFeedback.id,
          customerName: basicInfo.customerName,
          issueDescription: `Critical Low Score (${item.score}/5) in ${item.label}`,
          score: item.score,
          actionOwner: 'Sales & Quality Head',
          deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 Day Closure
          status: 'Open'
        });
        await this.carRepo.save(car);
      }
    }

    return savedFeedback;
  }

  async getStats() {
    const allFeedback = await this.feedbackRepo.find();
    
    if (allFeedback.length === 0) {
      return { averageScore: 0, csi: 0, totalResponses: 0, totalCars: 0, categoryAverages: {}, monthlyTrend: [] };
    }

    const totalResponses = allFeedback.length;
    
    // Improved Stats: Calculate averages for key sections
    const qualitySum = allFeedback.reduce((acc, f) => acc + (parseFloat(f.qualityAverage) || 0), 0);
    const avgQuality = qualitySum / totalResponses;

    const competitivenessSum = allFeedback.reduce((acc, f) => {
      const compSum = (f.pricingRating + f.deliveryLeadTimeRating + f.afterSalesServiceResponseRating + f.salesTeamApproachRating) / 4;
      return acc + compSum;
    }, 0);
    const avgCompetitiveness = competitivenessSum / totalResponses;

    const totalCars = await this.carRepo.count();

    return {
      averageScore: Number(((avgQuality + avgCompetitiveness) / 2).toFixed(2)),
      csi: Number((((avgQuality + avgCompetitiveness) / 10) * 100).toFixed(2)), // Normalized to 100
      totalResponses,
      totalCars,
      categoryAverages: {
        quality: Number(avgQuality.toFixed(2)),
        competitiveness: Number(avgCompetitiveness.toFixed(2))
      },
      // Calculate Monthly Trend for the last 6 months
      monthlyTrend: Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthName = d.toLocaleString('default', { month: 'short' });
        const year = d.getFullYear();
        
        // Filter feedback for this specific month/year
        const monthFeedback = allFeedback.filter(f => {
          const fDate = new Date(f.createdAt);
          return fDate.getMonth() === d.getMonth() && fDate.getFullYear() === year;
        });

        const monthAvg = monthFeedback.length > 0 
          ? monthFeedback.reduce((acc, f) => {
              const q = parseFloat(f.qualityAverage) || 0;
              const c = (f.pricingRating + f.deliveryLeadTimeRating + f.afterSalesServiceResponseRating + f.salesTeamApproachRating) / 4;
              return acc + ((q + c) / 2);
            }, 0) / monthFeedback.length
          : 0;

        return {
          month: monthName,
          score: Number(monthAvg.toFixed(2))
        };
      })
    };
  }

  async getCars() {
     return this.carRepo.find({
       order: { createdAt: 'DESC' },
       relations: ['feedback']
     });
  }
}
