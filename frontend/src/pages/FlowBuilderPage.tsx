import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Save, 
  ArrowLeft, 
  Layout
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import dagre from 'dagre';

const nodeTypes = {}; // We can add custom node types here later

const FlowBuilderContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [docTitle, setDocTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await api.get(`/documents/${id}`);
      setDocTitle(response.data.title);
      
      if (response.data.metadata) {
        setNodes(response.data.metadata.nodes || []);
        setEdges(response.data.metadata.edges || []);
      } else {
        // Initial node if empty
        setNodes([
          { 
            id: '1', 
            position: { x: 250, y: 5 }, 
            data: { label: 'Start' }, 
            type: 'input',
            style: { background: '#fff', border: '1px solid #777', borderRadius: '4px', width: 150 }
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
      alert('Failed to load chart');
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds)),
    [setEdges],
  );



  const onCallLayout = useCallback((direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 150, height: 50 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.targetPosition = isHorizontal ? Position.Left : Position.Top;
      node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 75,
          y: nodeWithPosition.y - 25,
        },
      };
    });

    setNodes(layoutedNodes);
    window.requestAnimationFrame(() => {
      fitView();
    });
  }, [nodes, edges, setNodes, fitView]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const metadata = {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 } // Simplified, can get actual via useReactFlow if needed
      };

      await api.put(`/documents/${id}`, {
        metadata
      });
      // Also update version? Ideally yes, but keeping simple for now
      alert('Chart saved successfully!');
    } catch (error) {
      console.error('Failed to save chart:', error);
      alert('Failed to save chart');
    } finally {
      setSaving(false);
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: (nodes.length + 1).toString(),
        type: 'default', // or custom type
        position,
        data: { label: `${type} node` },
        style: { background: '#fff', border: '1px solid #777', borderRadius: '4px', padding: 10, width: 150 }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, nodes, setNodes],
  );

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading builder...</div>;
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/charts')}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{docTitle}</h1>
            <p className="text-sm text-slate-500">Interactive Builder</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onCallLayout('TB')}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 flex items-center gap-2 text-sm font-medium"
            title="Auto Layout"
          >
            <Layout className="w-4 h-4" />
            Auto Layout
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Chart'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-4">
          <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Nodes</div>
          <div 
            className="bg-white p-3 rounded border border-slate-200 shadow-sm cursor-move hover:border-blue-400 transition"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'Process')}
          >
            Process Step
          </div>
          <div 
            className="bg-white p-3 rounded border border-slate-200 shadow-sm cursor-move hover:border-blue-400 transition"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'Decision')}
          >
            Decision Diamond
          </div>
          <div 
            className="bg-white p-3 rounded border border-slate-200 shadow-sm cursor-move hover:border-blue-400 transition"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'Start/End')}
          >
            Start / End
          </div>
          
          <div className="mt-auto p-4 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
            <p className="font-semibold mb-1">Tip:</p>
            Drag nodes from here to the canvas. Double click a node to edit text (todo).
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            <MiniMap />
            <Panel position="top-right" className="bg-white/80 backdrop-blur p-2 rounded shadow-sm border border-slate-200 text-xs text-slate-500">
              {nodes.length} nodes • {edges.length} connections
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default function FlowBuilderPage() {
  return (
    <ReactFlowProvider>
      <FlowBuilderContent />
    </ReactFlowProvider>
  );
}
