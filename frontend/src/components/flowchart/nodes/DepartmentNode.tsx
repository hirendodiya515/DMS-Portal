import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Edit, Trash2 } from 'lucide-react';
import type { FlowNodeData } from '../../../types/flow.types';

export interface DepartmentNodeData extends FlowNodeData {
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  editable?: boolean;
  [key: string]: unknown;
}

export default function DepartmentNode({ id, data, selected }: NodeProps<Node<DepartmentNodeData>>) {
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
      className={`relative px-8 py-6 rounded-xl border-2 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg transition-all cursor-pointer hover:scale-105 hover:shadow-xl ${
        selected ? 'border-indigo-500 shadow-xl' : 'border-indigo-200'
      }`}
      style={{ minWidth: '200px' }}
    >
      {/* All 4 side handles for flexible connections */}
      <Handle type="target" position={Position.Left} id="left-target" className="w-2 h-2 !bg-indigo-500" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-2 h-2 !bg-indigo-400" style={{ top: '30%' }} />
      
      <Handle type="target" position={Position.Top} id="top-target" className="w-2 h-2 !bg-indigo-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="w-2 h-2 !bg-indigo-400" style={{ left: '30%' }} />
      
      <Handle type="target" position={Position.Right} id="right-target" className="w-2 h-2 !bg-indigo-400" style={{ top: '30%' }} />
      <Handle type="source" position={Position.Right} id="right-source" className="w-2 h-2 !bg-indigo-500" />
      
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-2 h-2 !bg-indigo-400" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-2 h-2 !bg-indigo-400" />

      {/* Edit/Delete buttons */}
      {data.editable && (
        <div className="absolute -top-3 right-1 flex gap-1">
          <button
            onClick={handleEdit}
            className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all bg-blue-400 text-white hover:bg-blue-500 z-10"
            title="Edit department"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={handleDelete}
            className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all bg-red-400 text-white hover:bg-red-500 z-10"
            title="Delete department"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      <div className="text-center">
        <div className="font-bold text-indigo-800 text-lg">{data.label}</div>
        {data.description && (
          <div className="text-sm text-gray-600 mt-2">{data.description}</div>
        )}
        {!data.editable && (
          <div className="mt-3 text-xs text-indigo-500 font-medium">
            Click to view processes →
          </div>
        )}
      </div>
    </div>
  );
}
