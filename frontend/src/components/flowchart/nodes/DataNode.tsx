import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../../../types/flow.types';

interface DataNodeProps extends NodeProps {
  data: FlowNodeData & { showCriticalParams?: boolean };
}

export default function DataNode({ data, selected }: DataNodeProps) {
  return (
    <div className="relative" style={{ width: '180px', height: '80px' }}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />
      
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all ${
          selected ? 'scale-105' : ''
        }`}
      >
        <div
          className={`w-full h-full border-2 bg-white shadow-lg flex items-center justify-center ${
            selected ? 'border-purple-500 shadow-xl' : 'border-gray-300'
          }`}
          style={{
            clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)',
            background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
          }}
        >
          <div className="text-center px-4">
            <div className="font-semibold text-gray-800 text-sm">{data.label}</div>
            {data.description && (
              <div className="text-xs text-gray-500 mt-1">{data.description}</div>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500" />
    </div>
  );
}
