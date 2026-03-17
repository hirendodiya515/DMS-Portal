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

  async createFeedback(data: Partial<CustomerFeedback>) {
    // Insert feedback
    const feedback = this.feedbackRepo.create(data);
    const savedFeedback = await this.feedbackRepo.save(feedback);

    // Calculate if CAR is needed (any score <= 2)
    const ratings = {
      'Quality': data.qualityRating,
      'Delivery': data.deliveryRating,
      'Packaging': data.packagingRating,
      'Support': data.supportRating,
      'Response Time': data.responseRating,
      'Complaint Handling': data.complaintRating,
      'Documentation': data.documentationRating,
      'Overall': data.overallRating
    };

    const lowRatings = Object.entries(ratings).filter(([_, score]) => Number(score) <= 2);

    if (lowRatings.length > 0) {
      for (const [category, score] of lowRatings) {
        const car = this.carRepo.create({
          feedbackId: savedFeedback.id,
          customerName: data.companyName,
          issueDescription: `Low rating (${score}) in ${category}`,
          score: Number(score),
          actionOwner: 'Sales Head', // Default owner
          deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // +15 days
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
      return {
        averageScore: 0,
        csi: 0,
        totalResponses: 0,
        totalCars: 0,
        categoryAverages: {
          quality: 0,
          delivery: 0,
          packaging: 0,
          support: 0,
          response: 0,
          complaint: 0,
          documentation: 0,
          overall: 0,
        },
        monthlyTrend: [],
      };
    }

    const totalResponses = allFeedback.length;
    let totalScore = 0;
    const maxScorePerResponse = 40; // 8 categories * 5
    
    const categorySums = {
      quality: 0,
      delivery: 0,
      packaging: 0,
      support: 0,
      response: 0,
      complaint: 0,
      documentation: 0,
      overall: 0,
    };

    allFeedback.forEach((f) => {
      const respScore = 
        f.qualityRating + 
        f.deliveryRating + 
        f.packagingRating + 
        f.supportRating + 
        f.responseRating + 
        f.complaintRating + 
        f.documentationRating + 
        f.overallRating;

      totalScore += respScore;
      
      categorySums.quality += f.qualityRating;
      categorySums.delivery += f.deliveryRating;
      categorySums.packaging += f.packagingRating;
      categorySums.support += f.supportRating;
      categorySums.response += f.responseRating;
      categorySums.complaint += f.complaintRating;
      categorySums.documentation += f.documentationRating;
      categorySums.overall += f.overallRating;
    });

    const averageScore = totalScore / totalResponses / 8; // Average rating out of 5
    const csi = (totalScore / (totalResponses * maxScorePerResponse)) * 100;

    const totalCars = await this.carRepo.count();

    // Calculate monthly trend
    const monthlyTrendMap = new Map<string, { total: number, count: number }>();
    allFeedback.forEach(f => {
      const monthYear = `${f.createdAt.getFullYear()}-${String(f.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const avgRespScore = (
        f.qualityRating + f.deliveryRating + f.packagingRating + 
        f.supportRating + f.responseRating + f.complaintRating + 
        f.documentationRating + f.overallRating
      ) / 8;

      if (!monthlyTrendMap.has(monthYear)) {
        monthlyTrendMap.set(monthYear, { total: 0, count: 0 });
      }
      const data = monthlyTrendMap.get(monthYear)!;
      data.total += avgRespScore;
      data.count += 1;
    });

    const monthlyTrend = Array.from(monthlyTrendMap.entries())
      .map(([month, data]) => ({
        month,
        score: Number((data.total / data.count).toFixed(2))
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      averageScore: Number(averageScore.toFixed(2)),
      csi: Number(csi.toFixed(2)),
      totalResponses,
      totalCars,
      categoryAverages: {
        quality: Number((categorySums.quality / totalResponses).toFixed(2)),
        delivery: Number((categorySums.delivery / totalResponses).toFixed(2)),
        packaging: Number((categorySums.packaging / totalResponses).toFixed(2)),
        support: Number((categorySums.support / totalResponses).toFixed(2)),
        response: Number((categorySums.response / totalResponses).toFixed(2)),
        complaint: Number((categorySums.complaint / totalResponses).toFixed(2)),
        documentation: Number((categorySums.documentation / totalResponses).toFixed(2)),
        overall: Number((categorySums.overall / totalResponses).toFixed(2)),
      },
      monthlyTrend,
    };
  }

  async getCars() {
     return this.carRepo.find({
       order: { createdAt: 'DESC' },
     });
  }
}
