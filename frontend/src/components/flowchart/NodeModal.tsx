import { X, Plus, Trash2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CriticalParameter, FlowNodeData } from '../../types/flow.types';

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: FlowNodeData;
  onSave?: (data: { label: string; description: string; params: CriticalParameter[] }) => void;
  editable?: boolean;
}

export default function NodeModal({
  isOpen,
  onClose,
  nodeData,
  onSave,
  editable = false,
}: NodeModalProps) {
  const [label, setLabel] = useState(nodeData.label);
  const [description, setDescription] = useState(nodeData.description || '');
  const [params, setParams] = useState<CriticalParameter[]>(
    nodeData.criticalParams || []
  );

  // Reset state when nodeData changes
  useEffect(() => {
    setLabel(nodeData.label);
    setDescription(nodeData.description || '');
    setParams(nodeData.criticalParams || []);
  }, [nodeData]);

  if (!isOpen) return null;

  const handleAddParam = () => {
    setParams([
      ...params,
      { name: '', value: '', unit: '', type: 'process' },
    ]);
  };

  const handleDeleteParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const handleParamChange = (
    index: number,
    field: keyof CriticalParameter,
    value: string
  ) => {
    const updated = [...params];
    updated[index] = { ...updated[index], [field]: value };
    setParams(updated);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ label, description, params });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {editable ? (
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full text-lg font-bold bg-white/20 rounded px-2 py-1 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Process Name"
                />
              ) : (
                <h2 className="text-lg font-bold">{label}</h2>
              )}
              {editable ? (
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm bg-white/10 rounded px-2 py-1 mt-1 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Description (optional)"
                />
              ) : (
                <p className="text-sm text-white/80">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-80 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Critical Parameters
          </h3>

          {params.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No critical parameters defined
            </div>
          ) : (
            <div className="space-y-3">
              {params.map((param, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    param.type === 'process'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  {editable ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) =>
                            handleParamChange(idx, 'name', e.target.value)
                          }
                          placeholder="Parameter name"
                          className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <select
                          value={param.type}
                          onChange={(e) =>
                            handleParamChange(idx, 'type', e.target.value)
                          }
                          className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="process">Process</option>
                          <option value="quality">Quality</option>
                        </select>
                        <button
                          onClick={() => handleDeleteParam(idx)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) =>
                            handleParamChange(idx, 'value', e.target.value)
                          }
                          placeholder="Value"
                          className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={param.unit || ''}
                          onChange={(e) =>
                            handleParamChange(idx, 'unit', e.target.value)
                          }
                          placeholder="Unit"
                          className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-800">
                          {param.name}
                        </span>
                        <span
                          className={`ml-2 text-xs px-2 py-0.5 rounded ${
                            param.type === 'process'
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-green-200 text-green-800'
                          }`}
                        >
                          {param.type}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-800">
                          {param.value}
                        </span>
                        {param.unit && (
                          <span className="text-gray-500 ml-1">{param.unit}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between">
          {editable ? (
            <>
              <button
                onClick={handleAddParam}
                className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Plus size={18} />
                Add Parameter
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Save size={18} />
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
