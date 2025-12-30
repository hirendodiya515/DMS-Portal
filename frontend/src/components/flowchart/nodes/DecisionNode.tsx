import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Lightbulb, Edit, Trash2 } from 'lucide-react';
import type { FlowNodeData } from '../../../types/flow.types';

interface DecisionNodeProps extends NodeProps {
  data: FlowNodeData & {
    onShowParams?: (nodeId: string, data: FlowNodeData) => void;
    onEdit?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    editable?: boolean;
  };
}

export default function DecisionNode({ id, data, selected }: DecisionNodeProps) {
  const hasParams = data.criticalParams && data.criticalParams.length > 0;

  const handleShowParams = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onShowParams) {
      data.onShowParams(id, data);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onEdit) {
      data.onEdit(id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className="relative" style={{ width: '160px', height: '160px' }}>
      {/* Horizontal handles */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-orange-500" />

      {/* Action buttons */}
      <div className="absolute -top-1 right-0 flex gap-1 z-20">
        {hasParams && (
          <button
            onClick={handleShowParams}
            className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all bg-yellow-400 text-yellow-900 hover:bg-yellow-500"
            title="View critical parameters"
          >
            <Lightbulb size={12} />
          </button>
        )}
        {data.editable && (
          <>
            <button
              onClick={handleEdit}
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all bg-blue-400 text-white hover:bg-blue-500"
              title="Edit decision"
            >
              <Edit size={12} />
            </button>
            <button
              onClick={handleDelete}
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all bg-red-400 text-white hover:bg-red-500"
              title="Delete decision"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>

      <div
        className={`absolute inset-0 flex items-center justify-center transition-all ${
          selected ? 'scale-105' : ''
        }`}
        style={{
          transform: 'rotate(45deg)',
          transformOrigin: 'center',
        }}
      >
        <div
          className={`w-28 h-28 border-2 bg-white shadow-lg flex items-center justify-center ${
            selected ? 'border-orange-500 shadow-xl' : 'border-gray-300'
          }`}
        >
          <div
            style={{
              transform: 'rotate(-45deg)',
              transformOrigin: 'center',
            }}
            className="text-center px-2"
          >
            <div className="font-semibold text-gray-800 text-xs">{data.label}</div>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-orange-500" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 !bg-orange-500"
      />
    </div>
  );
}
