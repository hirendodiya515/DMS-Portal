import api from './api';
import type { Node, Edge } from '@xyflow/react';

export interface FlowchartData {
  id?: string;
  name?: string;
  nodes: Node[];
  edges: Edge[];
  departmentFlows: Record<string, { nodes: Node[]; edges: Edge[] }>;
  createdAt?: string;
  updatedAt?: string;
}

export const flowchartApi = {
  // Get the latest flowchart
  getLatest: async (): Promise<FlowchartData | null> => {
    try {
      const response = await api.get('/flowcharts/latest');
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch latest flowchart:', error);
      return null;
    }
  },

  // Save flowchart (create or update)
  save: async (data: FlowchartData): Promise<FlowchartData> => {
    const response = await api.post('/flowcharts', data);
    return response.data;
  },
};
