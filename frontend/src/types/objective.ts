export interface Measurement {
  id: string;
  actualValue: number;
  measurementDate: string;
  remarks?: string;
  subValues?: { subTargetId: string; value: number }[];
}

export interface Objective {
  id: string;
  objectiveNumber: string;
  name: string;
  description: string;
  type: 'quality' | 'environmental' | 'safety';
  department: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  uom: string;
  frequency: string;
  target: number;
  financialYear?: string;
  monthlyTargets?: Record<string, number>;
  carriedFromId?: string;
  ownerId?: string;
  owner?: { id?: string; firstName: string; lastName: string; email?: string };
  higherIsBetter: boolean;
  measurements: Measurement[];
  latestValue?: number | null;
  progress?: number;
  progressStatus?: string;
  createdAt: string;
  hasSubTargets?: boolean;
  aggregationType?: 'sum' | 'average';
  subTargets?: { id: string; name: string; target?: number }[];
}
