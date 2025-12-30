import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from '@xyflow/react';
import { useState, useEffect, useRef } from 'react';

// Edge labels with their colors
const EDGE_STATUSES: Record<string, { color: string; label: string }> = {
  OK: { color: '#22c55e', label: 'OK' },
  Pass: { color: '#22c55e', label: 'Pass' },
  Hold: { color: '#eab308', label: 'Hold' },
  Reject: { color: '#ef4444', label: 'Reject' },
  Fail: { color: '#ef4444', label: 'Fail' },
  Default: { color: '#ffffff', label: '' },
};

export interface CustomEdgeData {
  editable?: boolean;
  onLabelChange?: (edgeId: string, label: string) => void;
  onEditingChange?: (isEditing: boolean) => void;
  [key: string]: unknown;
}

export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  data,
}: EdgeProps) {
  const edgeData = data as CustomEdgeData | undefined;
  const labelStr = typeof label === 'string' ? label : '';
  const [isEditing, setIsEditing] = useState(false);
  const [currentLabel, setCurrentLabel] = useState(labelStr);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Sync with external label changes
  useEffect(() => {
    setCurrentLabel(labelStr);
  }, [labelStr]);

  // Notify parent when editing state changes
  useEffect(() => {
    if (edgeData?.onEditingChange) {
      edgeData.onEditingChange(isEditing);
    }
  }, [isEditing, edgeData]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePosition as Position,
    targetX,
    targetY,
    targetPosition: targetPosition as Position,
  });

  // Get color based on label
  const getEdgeColor = () => {
    const status = Object.keys(EDGE_STATUSES).find(
      (key) => key.toLowerCase() === currentLabel?.toLowerCase()
    );
    return status ? EDGE_STATUSES[status].color : '#ffffff';
  };

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (edgeData?.editable) {
      setIsEditing(true);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newLabel = e.target.value;
    setCurrentLabel(newLabel);
    setIsEditing(false);
    if (edgeData?.onLabelChange) {
      edgeData.onLabelChange(id, newLabel);
    }
  };

  const handleSelectBlur = () => {
    // Small delay to allow click to register before closing
    setTimeout(() => setIsEditing(false), 100);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Prevent edge click event when interacting with label/dropdown
    e.stopPropagation();
  };

  const edgeColor = getEdgeColor();

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 3,
          stroke: edgeColor,
        }}
      />
      {(currentLabel || edgeData?.editable) && (
        <EdgeLabelRenderer>
          <div
            onClick={handleContainerClick}
            onMouseDown={handleContainerClick}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {isEditing ? (
              <select
                ref={selectRef}
                autoFocus
                value={currentLabel}
                onChange={handleSelectChange}
                onBlur={handleSelectBlur}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-2 py-1 text-xs rounded border border-gray-300 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select --</option>
                <option value="OK">✓ OK</option>
                <option value="Pass">✓ Pass</option>
                <option value="Hold">⏸ Hold</option>
                <option value="Reject">✕ Reject</option>
                <option value="Fail">✕ Fail</option>
              </select>
            ) : (
              <div
                onClick={handleLabelClick}
                onMouseDown={(e) => e.stopPropagation()}
                className={`px-2 py-1 text-xs font-medium rounded shadow-md transition-all ${
                  edgeData?.editable
                    ? 'cursor-pointer hover:scale-110'
                    : 'cursor-default'
                }`}
                style={{
                  backgroundColor: edgeColor,
                  color: edgeColor === '#eab308' ? '#000' : '#fff',
                  minWidth: currentLabel ? 'auto' : '40px',
                  textAlign: 'center',
                }}
              >
                {currentLabel || (edgeData?.editable ? '+' : '')}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
