import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls as RFControls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  useReactFlow,
  Panel,
  type Node,
  type Edge,
  MarkerType,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RotateCcw, Home, ChevronRight, Plus, ChevronDown, Save } from 'lucide-react';

import ProcessNode from './nodes/ProcessNode';
import DecisionNode from './nodes/DecisionNode';
import StartEndNode from './nodes/StartEndNode';
import DataNode from './nodes/DataNode';
import DepartmentNode from './nodes/DepartmentNode';
import LabeledEdge from './nodes/CustomEdge';
import NodeModal from './NodeModal';
import { plantNodes, plantEdges, departmentFlows } from '../../data/sampleFlow';
import type { FlowNodeData, CriticalParameter, FlowNode } from '../../types/flow.types';
import { useAuthStore } from '../../stores/authStore';
import { flowchartApi, type FlowchartData } from '../../lib/flowchartApi';

const nodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  startEnd: StartEndNode,
  data: DataNode,
  department: DepartmentNode,
};

const edgeTypes = {
  labeled: LabeledEdge,
};

type ViewLevel = 'plant' | 'department';

// Default edge style - thicker with light color for visibility, animated
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  interactionWidth: 20,
  style: {
    strokeWidth: 3,
    stroke: '#ffffff',
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#ffffff',
    width: 12,
    height: 12,
  },
};

export default function FlowChart() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Global State to persist the entire model
  const globalState = useRef<FlowchartData>({
    nodes: plantNodes,
    edges: plantEdges,
    departmentFlows: departmentFlows
  });
  const [dbId, setDbId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [viewLevel, setViewLevel] = useState<ViewLevel>('plant');
  const [currentDepartment, setCurrentDepartment] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [editMode, setEditMode] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState<FlowNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Add Node Menu State
  const [showAddMenu, setShowAddMenu] = useState(false);

  const { fitView } = useReactFlow();

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      const data = await flowchartApi.getLatest();
      if (data) {
        globalState.current = {
            nodes: data.nodes || [],
            edges: data.edges || [],
            departmentFlows: data.departmentFlows || {}
        };
        setDbId(data.id);
        // Initialize with Plant view
        setNodes((data.nodes || []) as FlowNode[]);
        setEdges((data.edges || []) as Edge[]);
      } else {
        // Fallback to sample data and save it
        setNodes(plantNodes);
        setEdges(plantEdges);
        // Trigger initial save
        saveGlobalState();
      }
      setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 100);
    };
    loadData();
  }, []);

  // Sync current view changes to Global State
  useEffect(() => {
    // We only update the specific part of global state that corresponds to current view
    if (viewLevel === 'plant') {
      globalState.current.nodes = nodes;
      globalState.current.edges = edges;
    } else if (currentDepartment) {
       if (!globalState.current.departmentFlows) globalState.current.departmentFlows = {};
       globalState.current.departmentFlows[currentDepartment] = { nodes, edges };
    }

    // Debounced Auto-Save
    if (isAdmin && dbId) { // Only save if we have a DB ID (after initial load)
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            saveGlobalState();
        }, 2000);
    }
  }, [nodes, edges, viewLevel, currentDepartment, isAdmin, dbId]);

  const saveGlobalState = async () => {
      if (!isAdmin) return;
      setIsSaving(true);
      try {
          const dataToSave = {
              id: dbId,
              name: 'Main Flowchart',
              ...globalState.current
          };
          const saved = await flowchartApi.save(dataToSave);
          if (!dbId) setDbId(saved.id);
      } catch (err) {
          console.error("Failed to save flowchart", err);
      } finally {
          setIsSaving(false);
      }
  };

  // Show params modal handler
  const handleShowParams = useCallback((nodeId: string, data: FlowNodeData) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeData(data);
    setModalOpen(true);
  }, []);

  // Save node data handler (including name, description, and params)
  const handleSaveNodeData = useCallback(
    (data: { label: string; description: string; params: CriticalParameter[] }) => {
      if (!isAdmin) return;
      if (selectedNodeId) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === selectedNodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    label: data.label,
                    description: data.description,
                    criticalParams: data.params,
                  },
                }
              : node
          ) as FlowNode[]
        );
      }
    },
    [selectedNodeId, setNodes, isAdmin]
  );

  // Edit node handler
  const handleEditNode = useCallback((nodeId: string) => {
    if (!isAdmin) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNodeId(nodeId);
      setSelectedNodeData(node.data as FlowNodeData);
      setModalOpen(true);
    }
  }, [nodes, isAdmin]);

  // Delete node handler
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!isAdmin) return;
      if (confirm('Are you sure you want to delete this node?')) {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) =>
          eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
        );
      }
    },
    [setNodes, setEdges, isAdmin]
  );

  // Add node handler - Now accepts type
  const handleAddNode = useCallback((type: 'process' | 'decision' | 'data' | 'startEnd' | 'department', subType?: string) => {
    if (!isAdmin) return;
    setShowAddMenu(false); // Close menu
    const isPlant = viewLevel === 'plant';
    
    // Safety check: prevent adding non-department nodes to plant view if desired (though user might want flexibility)
    // Assuming Plant View = Departments only, Department View = Steps
    if (isPlant && type !== 'department') {
        alert("You can only add Departments in the Plant Overview.");
        return;
    }

    const newId = `new-${Date.now()}`;
    let label = 'New Node';
    // let nodeType: any = type; // Removed unused
    
    if (type === 'process') label = 'New Process';
    else if (type === 'decision') label = 'New Decision';
    else if (type === 'data') label = 'New Data';
    else if (type === 'startEnd') {
        label = subType === 'start' ? 'Start' : 'End';
    }
    else if (type === 'department') label = 'New Department';

    const newNodeData: FlowNodeData = {
      label,
      description: 'Click to edit',
      nodeType: (type === 'startEnd' ? subType : type) as any, 
      criticalParams: [],
    };
    
    const newNode: Node<FlowNodeData> = {
      id: newId,
      type: type,
      position: { x: 400, y: 300 }, // Center-ish
      data: newNodeData,
    };

    setNodes((nds) => [...nds, newNode]);
    
    // Open modal for editing immediately (optional, good for UX)
    if (type !== 'startEnd') { // Don't typically edit params for start/end immediately
        setSelectedNodeId(newId);
        setSelectedNodeData(newNodeData);
        setModalOpen(true);
    }
  }, [setNodes, viewLevel, isAdmin]);

  // Inject handlers into node data
  const nodesWithHandlers = useMemo(() => {
    const isEditable = editMode && isAdmin;
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onShowParams: handleShowParams,
        onEdit: isEditable ? handleEditNode : undefined,
        onDelete: isEditable ? handleDeleteNode : undefined,
        editable: isEditable,
      },
    }));
  }, [nodes, editMode, isAdmin, handleShowParams, handleEditNode, handleDeleteNode]);

  // Edge label change handler
  const handleEdgeLabelChange = useCallback(
    (edgeId: string, label: string) => {
      if (!isAdmin) return;
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === edgeId ? { ...edge, label } : edge
        )
      );
    },
    [setEdges, isAdmin]
  );

  // Inject handlers into edge data
  const edgesWithData = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      type: 'labeled',
      data: {
        editable: editMode && isAdmin,
        onLabelChange: handleEdgeLabelChange,
      },
    }));
  }, [edges, editMode, isAdmin, handleEdgeLabelChange]);

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      if (!isAdmin) return;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'labeled',
            animated: true,
            data: { editable: true, onLabelChange: handleEdgeLabelChange },
          },
          eds
        )
      )
    },
    [setEdges, handleEdgeLabelChange, isAdmin]
  );

  // Delete edge handler
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: { id: string }) => {
      if (editMode && isAdmin) {
        if (confirm('Delete this connector?')) {
          setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        }
      }
    },
    [editMode, isAdmin, setEdges]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Only drill down if NOT in edit mode
      if (!editMode && viewLevel === 'plant' && node.type === 'department') {
        const deptId = node.id;
        // Check if we have flow data for this department
        let deptFlowData = globalState.current.departmentFlows?.[deptId];
        
        // If no flow exists yet, init empty or generic
        if (!deptFlowData) {
            deptFlowData = { nodes: [], edges: [] };
        }

        setCurrentDepartment(deptId);
        setDepartmentName((node.data as FlowNodeData).label);
        setNodes(deptFlowData.nodes as FlowNode[]);
        setEdges(deptFlowData.edges as Edge[]);
        setViewLevel('department');
        setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 50);
      }
    },
    [viewLevel, editMode, setNodes, setEdges, fitView]
  );

  const handleReset = useCallback(() => {
    // Save current department state before leaving? (Already handled by Sync Effect)
    
    // Restore Plant View
    setNodes(globalState.current.nodes as FlowNode[]);
    setEdges(globalState.current.edges as Edge[]);
    setViewLevel('plant');
    setCurrentDepartment(null);
    setDepartmentName('');
    setEditMode(false);
    setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 50);
  }, [setNodes, setEdges, fitView]);

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative">
      <ReactFlow
        nodes={nodesWithHandlers}
        edges={edgesWithData}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ strokeWidth: 3, stroke: '#ffffff' }}
        snapToGrid={true}
        snapGrid={[5, 5]}
        deleteKeyCode={(editMode && isAdmin) ? 'Backspace' : null}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'department') return '#6366f1';
            if (node.type === 'startEnd') {
              return node.data.nodeType === 'start' ? '#22c55e' : '#ef4444';
            }
            if (node.type === 'decision') return '#f97316';
            if (node.type === 'data') return '#a855f7';
            return '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.3)"
          style={{ background: '#0f172a' }}
        />
        <RFControls position="bottom-right" />

        {/* Header Panel */}
        <Panel position="top-left">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Home size={16} className="text-indigo-500" />
              <span className="font-medium cursor-pointer hover:text-indigo-600" onClick={handleReset}>Plant Overview</span>
              {viewLevel === 'department' && (
                <>
                  <ChevronRight size={16} className="text-slate-400" />
                  <span className="text-indigo-600 font-semibold">{departmentName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">
                {viewLevel === 'plant' ? 'Plant Process Map' : `${departmentName} Processes`}
                </h1>
                {isSaving && <span className="text-xs text-slate-400 flex items-center gap-1"><Save size={12}/> Saving...</span>}
            </div>
          </div>
        </Panel>

        {/* Action Buttons - Only shown for Admins */}
        <Panel position="top-right">
          <div className="flex gap-2 relative">
            {isAdmin && (
              <>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl font-medium transition-all transform hover:scale-105 active:scale-95 ${
                    editMode
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  } border`}
                >
                  {editMode ? 'Stop Editing' : 'Customize Flow'}
                </button>
                {editMode && (
                  <div className="relative">
                      <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg shadow-xl hover:bg-emerald-700 transition-all font-medium border border-emerald-500 transform hover:scale-105"
                      >
                        <Plus size={18} />
                        {viewLevel === 'plant' ? 'Add Dept' : 'Add Step'}
                        <ChevronDown size={14} />
                      </button>

                      {/* Dropdown Menu */}
                      {showAddMenu && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in duration-150">
                              {viewLevel === 'plant' ? (
                                  <button
                                    onClick={() => handleAddNode('department')}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
                                  >
                                    <div className="w-3 h-3 bg-indigo-500 rounded"></div> Department
                                  </button>
                              ) : (
                                  <>
                                    <button
                                        onClick={() => handleAddNode('process')}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
                                    >
                                        <div className="w-3 h-3 bg-blue-500 rounded"></div> Process
                                    </button>
                                    <button
                                        onClick={() => handleAddNode('decision')}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
                                    >
                                        <div className="w-3 h-3 bg-orange-500 rotate-45"></div> Decision
                                    </button>
                                    <button
                                        onClick={() => handleAddNode('data')}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
                                    >
                                        <div className="w-3 h-3 bg-purple-500 skew-x-12"></div> Data
                                    </button>
                                    <div className="border-t border-slate-100 my-1"></div>
                                    <button
                                        onClick={() => handleAddNode('startEnd', 'start')}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
                                    >
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Start
                                    </button>
                                    <button
                                        onClick={() => handleAddNode('startEnd', 'end')}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
                                    >
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div> End
                                    </button>
                                  </>
                              )}
                          </div>
                      )}
                  </div>
                )}
              </>
            )}
            {viewLevel === 'department' && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg shadow-xl text-slate-700 hover:bg-slate-50 transition-all font-medium border border-slate-200 transform hover:scale-105"
              >
                <RotateCcw size={18} />
                Root Map
              </button>
            )}
          </div>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-3 border border-white/20">
            <div className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Map Legend</div>
            <div className="space-y-1.5">
              {viewLevel === 'plant' ? (
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-4 h-4 rounded bg-indigo-500 border border-indigo-400"></div>
                  <span>Department Block</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <div className="w-4 h-4 rounded bg-blue-500 border border-blue-400"></div>
                    <span>Process Step</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <div className="w-4 h-4 rotate-45 bg-orange-500 border border-orange-400"></div>
                    <span>Decision Point</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 border border-emerald-400"></div>
                    <span>Start / End</span>
                  </div>
                  {editMode && (
                    <div className="flex items-center gap-2 text-xs mt-2 text-indigo-600 font-medium">
                      <span>📐 Grid Snap Active (5px)</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Node Edit Modal */}
      {selectedNodeData && (
        <NodeModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedNodeData(null);
            setSelectedNodeId(null);
          }}
          nodeData={selectedNodeData}
          onSave={editMode && isAdmin ? handleSaveNodeData : undefined}
          editable={editMode && isAdmin}
        />
      )}
    </div>
  );
}
