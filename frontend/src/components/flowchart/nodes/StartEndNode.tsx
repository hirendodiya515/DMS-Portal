import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../../../types/flow.types';

interface StartEndNodeProps extends NodeProps {
  data: FlowNodeData;
}

export default function StartEndNode({ data, selected }: StartEndNodeProps) {
  const isStart = data.nodeType === 'start';

  return (
    <div
      className={`px-6 py-3 rounded-full border-2 bg-white shadow-lg transition-all ${
        selected
          ? isStart
            ? 'border-green-500 shadow-xl'
            : 'border-red-500 shadow-xl'
          : 'border-gray-300'
      } ${isStart ? 'bg-green-50' : 'bg-red-50'}`}
      style={{ minWidth: '100px' }}
    >
      {/* Horizontal handles */}
      {!isStart && (
        <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-500" />
      )}

      <div className="text-center">
        <div
          className={`font-bold text-sm ${
            isStart ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {data.label}
        </div>
      </div>

      {isStart && (
        <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-500" />
      )}
    </div>
  );
}
