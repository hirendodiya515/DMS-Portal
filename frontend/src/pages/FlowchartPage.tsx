import FlowChart from '../components/flowchart/FlowChart';
import { ReactFlowProvider } from '@xyflow/react';

export default function FlowchartPage() {
  return (
    // Fixed position relative to viewport minus Sidebar (w-20 collapsed) and Header (h-16)
    // We use typical Layout dimensions for admin dashboards.
    // If layout uses flex, this might need adjustment, but fixed is safest for "Full Screen" feel.
    <div className="fixed inset-0 top-16 left-20 z-10 bg-slate-900 transition-all duration-300">
      <ReactFlowProvider>
        <FlowChart />
      </ReactFlowProvider>
    </div>
  );
}
