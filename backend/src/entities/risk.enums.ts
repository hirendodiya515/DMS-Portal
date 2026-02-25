export enum RiskType {
  QRA = 'qra',      // Quality Risk Assessment (ISO 9001)
  HIRA = 'hira',    // Hazard Identification & Risk Assessment (ISO 45001)
  EAA = 'eaa',      // Environmental Aspect Assessment (ISO 14001)
}

export enum RiskStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  CLOSED = 'closed',
}

export enum RiskLevel {
  LOW = 'low',         // 1-4
  MEDIUM = 'medium',   // 5-9
  HIGH = 'high',       // 10-16
  CRITICAL = 'critical', // 17-25
}

// Calculate risk level from rating
export function calculateRiskLevel(rating: number): RiskLevel {
  if (rating <= 4) return RiskLevel.LOW;
  if (rating <= 9) return RiskLevel.MEDIUM;
  if (rating <= 16) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}
