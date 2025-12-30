import { type FlowNode, type FlowEdge } from '../types/flow.types';

// Plant-level departments - Horizontal layout
export const plantNodes: FlowNode[] = [
  {
    id: 'dept-1',
    type: 'department',
    position: { x: 50, y: 200 },
    data: {
      label: 'Raw Material',
      description: 'Material receiving & storage',
      nodeType: 'process',
    },
  },
  {
    id: 'dept-2',
    type: 'department',
    position: { x: 300, y: 200 },
    data: {
      label: 'Processing',
      description: 'Heat treatment & forming',
      nodeType: 'process',
    },
  },
  {
    id: 'dept-3',
    type: 'department',
    position: { x: 550, y: 200 },
    data: {
      label: 'Quality Control',
      description: 'Inspection & testing',
      nodeType: 'process',
    },
  },
  {
    id: 'dept-4',
    type: 'department',
    position: { x: 800, y: 200 },
    data: {
      label: 'Finishing',
      description: 'Surface treatment & coating',
      nodeType: 'process',
    },
  },
  {
    id: 'dept-5',
    type: 'department',
    position: { x: 1050, y: 200 },
    data: {
      label: 'Packaging',
      description: 'Packing & dispatch',
      nodeType: 'process',
    },
  },
];

export const plantEdges: FlowEdge[] = [
  { id: 'e-dept-1-2', source: 'dept-1', target: 'dept-2', type: 'smoothstep', animated: true },
  { id: 'e-dept-2-3', source: 'dept-2', target: 'dept-3', type: 'smoothstep', animated: true },
  { id: 'e-dept-3-4', source: 'dept-3', target: 'dept-4', type: 'smoothstep', animated: true },
  { id: 'e-dept-4-5', source: 'dept-4', target: 'dept-5', type: 'smoothstep', animated: true },
];

// Department-level processes - Horizontal layout
export const departmentFlows: Record<string, { nodes: FlowNode[]; edges: FlowEdge[] }> = {
  'dept-1': {
    nodes: [
      {
        id: '1-1',
        type: 'startEnd',
        position: { x: 0, y: 200 },
        data: { label: 'Start', nodeType: 'start' },
      },
      {
        id: '1-2',
        type: 'process',
        position: { x: 180, y: 185 },
        data: {
          label: 'Material Receipt',
          description: 'Receive raw materials from vendor',
          nodeType: 'process',
          criticalParams: [
            { name: 'Material Grade', value: 'SS304/SS316', unit: '', type: 'quality' },
            { name: 'Storage Temp', value: '15-30', unit: '°C', type: 'process' },
          ],
        },
      },
      {
        id: '1-3',
        type: 'decision',
        position: { x: 380, y: 130 },
        data: {
          label: 'Incoming Inspection',
          description: 'Check material quality',
          nodeType: 'decision',
          criticalParams: [
            { name: 'Visual Check', value: 'No defects', unit: '', type: 'quality' },
            { name: 'Certificate', value: 'Required', unit: '', type: 'quality' },
          ],
        },
      },
      {
        id: '1-4',
        type: 'process',
        position: { x: 620, y: 185 },
        data: {
          label: 'Material Storage',
          description: 'Store in designated area',
          nodeType: 'process',
          criticalParams: [
            { name: 'Humidity', value: '<60', unit: '%', type: 'process' },
            { name: 'FIFO', value: 'Maintained', unit: '', type: 'quality' },
          ],
        },
      },
      {
        id: '1-5',
        type: 'process',
        position: { x: 480, y: 350 },
        data: {
          label: 'Rejection',
          description: 'Return to vendor',
          nodeType: 'process',
        },
      },
      {
        id: '1-6',
        type: 'startEnd',
        position: { x: 850, y: 200 },
        data: { label: 'End', nodeType: 'end' },
      },
    ],
    edges: [
      { id: 'e1-1-2', source: '1-1', target: '1-2', type: 'smoothstep', animated: true },
      { id: 'e1-2-3', source: '1-2', target: '1-3', type: 'smoothstep', animated: true },
      { id: 'e1-3-4', source: '1-3', target: '1-4', type: 'smoothstep', label: 'Pass', animated: true },
      { id: 'e1-3-5', source: '1-3', target: '1-5', type: 'smoothstep', label: 'Fail' },
      { id: 'e1-4-6', source: '1-4', target: '1-6', type: 'smoothstep', animated: true },
    ],
  },
  'dept-2': {
    nodes: [
      {
        id: '2-1',
        type: 'startEnd',
        position: { x: 0, y: 200 },
        data: { label: 'Start', nodeType: 'start' },
      },
      {
        id: '2-2',
        type: 'process',
        position: { x: 180, y: 185 },
        data: {
          label: 'Pre-heating',
          description: 'Initial heating stage',
          nodeType: 'process',
          criticalParams: [
            { name: 'Temperature', value: '200-250', unit: '°C', type: 'process' },
            { name: 'Duration', value: '15-20', unit: 'min', type: 'process' },
          ],
        },
      },
      {
        id: '2-3',
        type: 'process',
        position: { x: 380, y: 185 },
        data: {
          label: 'Main Heating',
          description: 'Critical heat treatment',
          nodeType: 'process',
          criticalParams: [
            { name: 'Temperature', value: '850-900', unit: '°C', type: 'process' },
            { name: 'Duration', value: '45-60', unit: 'min', type: 'process' },
            { name: 'Atmosphere', value: 'Inert Gas', unit: '', type: 'quality' },
          ],
        },
      },
      {
        id: '2-4',
        type: 'process',
        position: { x: 580, y: 185 },
        data: {
          label: 'Forming',
          description: 'Shape the material',
          nodeType: 'process',
          criticalParams: [
            { name: 'Pressure', value: '50-80', unit: 'bar', type: 'process' },
            { name: 'Die Temp', value: '300-350', unit: '°C', type: 'process' },
          ],
        },
      },
      {
        id: '2-5',
        type: 'process',
        position: { x: 780, y: 185 },
        data: {
          label: 'Controlled Cooling',
          description: 'Gradual temperature reduction',
          nodeType: 'process',
          criticalParams: [
            { name: 'Cooling Rate', value: '5-10', unit: '°C/min', type: 'process' },
            { name: 'Final Temp', value: '<50', unit: '°C', type: 'quality' },
          ],
        },
      },
      {
        id: '2-6',
        type: 'startEnd',
        position: { x: 1000, y: 200 },
        data: { label: 'End', nodeType: 'end' },
      },
    ],
    edges: [
      { id: 'e2-1-2', source: '2-1', target: '2-2', type: 'smoothstep', animated: true },
      { id: 'e2-2-3', source: '2-2', target: '2-3', type: 'smoothstep', animated: true },
      { id: 'e2-3-4', source: '2-3', target: '2-4', type: 'smoothstep', animated: true },
      { id: 'e2-4-5', source: '2-4', target: '2-5', type: 'smoothstep', animated: true },
      { id: 'e2-5-6', source: '2-5', target: '2-6', type: 'smoothstep', animated: true },
    ],
  },
  'dept-3': {
    nodes: [
      {
        id: '3-1',
        type: 'startEnd',
        position: { x: 0, y: 200 },
        data: { label: 'Start', nodeType: 'start' },
      },
      {
        id: '3-2',
        type: 'process',
        position: { x: 180, y: 185 },
        data: {
          label: 'Visual Inspection',
          description: 'Check for surface defects',
          nodeType: 'process',
          criticalParams: [
            { name: 'Lighting', value: '1000 Lux', unit: '', type: 'process' },
            { name: 'Surface', value: 'No cracks', unit: '', type: 'quality' },
          ],
        },
      },
      {
        id: '3-3',
        type: 'process',
        position: { x: 380, y: 185 },
        data: {
          label: 'Dimensional Check',
          description: 'Measure dimensions',
          nodeType: 'process',
          criticalParams: [
            { name: 'Tolerance', value: '±0.05', unit: 'mm', type: 'quality' },
            { name: 'Instrument', value: 'CMM', unit: '', type: 'process' },
          ],
        },
      },
      {
        id: '3-4',
        type: 'decision',
        position: { x: 560, y: 130 },
        data: {
          label: 'Hardness Test',
          description: 'Check material hardness',
          nodeType: 'decision',
          criticalParams: [
            { name: 'Hardness', value: '45-50', unit: 'HRC', type: 'quality' },
            { name: 'Method', value: 'Rockwell C', unit: '', type: 'process' },
          ],
        },
      },
      {
        id: '3-5',
        type: 'process',
        position: { x: 640, y: 350 },
        data: {
          label: 'Rework',
          description: 'Send for re-processing',
          nodeType: 'process',
        },
      },
      {
        id: '3-6',
        type: 'startEnd',
        position: { x: 820, y: 200 },
        data: { label: 'End', nodeType: 'end' },
      },
    ],
    edges: [
      { id: 'e3-1-2', source: '3-1', target: '3-2', type: 'smoothstep', animated: true },
      { id: 'e3-2-3', source: '3-2', target: '3-3', type: 'smoothstep', animated: true },
      { id: 'e3-3-4', source: '3-3', target: '3-4', type: 'smoothstep', animated: true },
      { id: 'e3-4-5', source: '3-4', target: '3-5', type: 'smoothstep', label: 'Fail' },
      { id: 'e3-4-6', source: '3-4', target: '3-6', type: 'smoothstep', label: 'Pass', animated: true },
    ],
  },
  'dept-4': {
    nodes: [
      {
        id: '4-1',
        type: 'startEnd',
        position: { x: 0, y: 200 },
        data: { label: 'Start', nodeType: 'start' },
      },
      {
        id: '4-2',
        type: 'process',
        position: { x: 180, y: 185 },
        data: {
          label: 'Surface Preparation',
          description: 'Clean and prepare surface',
          nodeType: 'process',
          criticalParams: [
            { name: 'Roughness', value: 'Ra 1.6', unit: 'μm', type: 'quality' },
            { name: 'Cleaning', value: 'Ultrasonic', unit: '', type: 'process' },
          ],
        },
      },
      {
        id: '4-3',
        type: 'process',
        position: { x: 400, y: 185 },
        data: {
          label: 'Coating Application',
          description: 'Apply protective coating',
          nodeType: 'process',
          criticalParams: [
            { name: 'Thickness', value: '25-35', unit: 'μm', type: 'quality' },
            { name: 'Method', value: 'Spray', unit: '', type: 'process' },
          ],
        },
      },
      {
        id: '4-4',
        type: 'process',
        position: { x: 620, y: 185 },
        data: {
          label: 'Curing',
          description: 'Cure the coating',
          nodeType: 'process',
          criticalParams: [
            { name: 'Temperature', value: '180-200', unit: '°C', type: 'process' },
            { name: 'Duration', value: '30', unit: 'min', type: 'process' },
          ],
        },
      },
      {
        id: '4-5',
        type: 'startEnd',
        position: { x: 840, y: 200 },
        data: { label: 'End', nodeType: 'end' },
      },
    ],
    edges: [
      { id: 'e4-1-2', source: '4-1', target: '4-2', type: 'smoothstep', animated: true },
      { id: 'e4-2-3', source: '4-2', target: '4-3', type: 'smoothstep', animated: true },
      { id: 'e4-3-4', source: '4-3', target: '4-4', type: 'smoothstep', animated: true },
      { id: 'e4-4-5', source: '4-4', target: '4-5', type: 'smoothstep', animated: true },
    ],
  },
  'dept-5': {
    nodes: [
      {
        id: '5-1',
        type: 'startEnd',
        position: { x: 0, y: 200 },
        data: { label: 'Start', nodeType: 'start' },
      },
      {
        id: '5-2',
        type: 'process',
        position: { x: 180, y: 185 },
        data: {
          label: 'Final Inspection',
          description: 'Final quality check',
          nodeType: 'process',
          criticalParams: [
            { name: 'Checklist', value: '100%', unit: '', type: 'quality' },
            { name: 'Documentation', value: 'Complete', unit: '', type: 'quality' },
          ],
        },
      },
      {
        id: '5-3',
        type: 'process',
        position: { x: 400, y: 185 },
        data: {
          label: 'Labeling',
          description: 'Apply product labels',
          nodeType: 'process',
          criticalParams: [
            { name: 'Barcode', value: 'Verified', unit: '', type: 'quality' },
            { name: 'Traceability', value: 'Complete', unit: '', type: 'quality' },
          ],
        },
      },
      {
        id: '5-4',
        type: 'process',
        position: { x: 620, y: 185 },
        data: {
          label: 'Packing',
          description: 'Pack for shipment',
          nodeType: 'process',
          criticalParams: [
            { name: 'Packaging', value: 'Vacuum Sealed', unit: '', type: 'process' },
            { name: 'Quantity', value: 'As per order', unit: '', type: 'quality' },
          ],
        },
      },
      {
        id: '5-5',
        type: 'startEnd',
        position: { x: 840, y: 200 },
        data: { label: 'End', nodeType: 'end' },
      },
    ],
    edges: [
      { id: 'e5-1-2', source: '5-1', target: '5-2', type: 'smoothstep', animated: true },
      { id: 'e5-2-3', source: '5-2', target: '5-3', type: 'smoothstep', animated: true },
      { id: 'e5-3-4', source: '5-3', target: '5-4', type: 'smoothstep', animated: true },
      { id: 'e5-4-5', source: '5-4', target: '5-5', type: 'smoothstep', animated: true },
    ],
  },
};
