import Tree from 'react-d3-tree';

interface OrgChartTreeProps {
  data: any;
  onNodeClick: (node: any) => void;
  isLoading?: boolean;
}

const containerStyles = {
  width: '100%',
  height: 'calc(100vh - 150px)', // Adjust based on header
  background: '#f8fafc',
  borderRadius: '12px',
  overflow: 'hidden',
};

// Custom Node Layout
const renderCustomNodeElement = ({ nodeDatum, toggleNode, onNodeClick }: any) => (
  <g>
    <foreignObject width="220" height="120" x="-110" y="-60">
      <div 
        style={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            textAlign: 'center',
            cursor: 'pointer',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}
        onClick={(e) => {
             // Stop propagation to prevent tree pan/zoom events if needed
             e.stopPropagation(); 
             onNodeClick(nodeDatum);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            {/* Photo Avatar */}
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid #e2e8f0',
                backgroundColor: '#f1f5f9'
            }}>
                {nodeDatum.attributes?.photoUrl ? (
                    <img 
                        src={nodeDatum.attributes.photoUrl} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#cbd5e1' }}>
                        👤
                    </div>
                )}
            </div>

            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nodeDatum.name}
                </h3>
                {nodeDatum.attributes?.designation && (
                    <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                        {nodeDatum.attributes.designation}
                    </p>
                )}
                {nodeDatum.attributes?.department && (
                     <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
                       {nodeDatum.attributes.department}
                     </p>
                )}
            </div>
        </div>
        
        {/* Toggle Button Area */}
        {nodeDatum.children && nodeDatum.children.length > 0 && (
             <div 
                onClick={(e) => {
                    e.stopPropagation();
                    toggleNode();
                }}
                style={{ 
                    marginTop: '8px', 
                    fontSize: '10px', 
                    color: '#3b82f6', 
                    backgroundColor: '#eff6ff', 
                    width: '100%', 
                    padding: '2px 0', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
             >
               {nodeDatum.__rd3t.collapsed ? `Show Team (${nodeDatum.children.length}) ↓` : 'Hide Team ↑'}
             </div>
        )}
      </div>
    </foreignObject>
  </g>
);

export default function OrgChartTree({ data, onNodeClick, isLoading }: OrgChartTreeProps) {
  if (isLoading) {
      return (
          <div style={{ ...containerStyles, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="text-slate-400">Loading chart...</p>
          </div>
      );
  }

  if (!data) {
      return (
          <div style={{ ...containerStyles, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="text-slate-400">No chart data available.</p>
          </div>
      );
  }

  return (
    <div style={containerStyles} className="border border-slate-200">
      <Tree 
        data={data} 
        renderCustomNodeElement={(rd3tProps) => renderCustomNodeElement({ ...rd3tProps, onNodeClick })}
        orientation="vertical"
        pathFunc="step"
        separation={{ siblings: 2, nonSiblings: 2.5 }}
        translate={{ x: window.innerWidth / 2, y: 100 }}
        enableLegacyTransitions={true}
        transitionDuration={500}
      />
    </div>
  );
}
