import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Lightbulb, Edit, Trash2 } from 'lucide-react';
import type { FlowNodeData } from '../../../types/flow.types';

interface ProcessNodeProps extends NodeProps {
  data: FlowNodeData & {
    onShowParams?: (nodeId: string, data: FlowNodeData) => void;
    onEdit?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    editable?: boolean;
  };
}

export default function ProcessNode({ id, data, selected }: ProcessNodeProps) {
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
    <div
      className={`relative px-6 py-4 rounded-lg border-2 bg-white shadow-lg transition-all ${
        selected ? 'border-blue-500 shadow-xl' : 'border-gray-300'
      }`}
      style={{ minWidth: '160px' }}
    >
      {/* All 4 side handles for flexible connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target"
        className="w-2 h-2 !bg-blue-500" 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-source"
        className="w-2 h-2 !bg-blue-400" 
        style={{ top: '30%' }}
      />
      
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top-target"
        className="w-2 h-2 !bg-green-500" 
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top-source"
        className="w-2 h-2 !bg-green-400" 
        style={{ left: '30%' }}
      />
      
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target"
        className="w-2 h-2 !bg-blue-400" 
        style={{ top: '30%' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source"
        className="w-2 h-2 !bg-blue-500" 
      />
      
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target"
        className="w-2 h-2 !bg-green-400" 
        style={{ left: '30%' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom-source"
        className="w-2 h-2 !bg-green-500" 
      />

      {/* Action buttons */}
      <div className="absolute -top-3 right-1 flex gap-1">
        {hasParams && (
          <button
            onClick={handleShowParams}
            className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all bg-yellow-400 text-yellow-900 hover:bg-yellow-500 z-10"
            title="View critical parameters"
          >
            <Lightbulb size={12} />
          </button>
        )}
        {data.editable && (
          <>
            <button
              onClick={handleEdit}
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all bg-blue-400 text-white hover:bg-blue-500 z-10"
              title="Edit process"
            >
              <Edit size={12} />
            </button>
            <button
              onClick={handleDelete}
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all bg-red-400 text-white hover:bg-red-500 z-10"
              title="Delete process"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>

      <div className="text-center">
        <div className="font-semibold text-gray-800 text-sm">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-500 mt-1">{data.description}</div>
        )}
      </div>
    </div>
  );
}
