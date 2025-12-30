import type { Node, Edge } from '@xyflow/react';

export interface CriticalParameter {
  name: string;
  value: string;
  unit?: string;
  type: 'process' | 'quality';
}

export interface FlowNodeData {
  label: string;
  description?: string;
  criticalParams?: CriticalParameter[];
  nodeType: 'start' | 'end' | 'process' | 'decision' | 'data';
  [key: string]: unknown;
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

export interface FilterState {
  startNodeId: string;
  endNodeId: string;
  isActive: boolean;
}

export interface ControlsProps {
  showCriticalParams: boolean;
  onToggleCriticalParams: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  filterState: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onResetFilter: () => void;
}
