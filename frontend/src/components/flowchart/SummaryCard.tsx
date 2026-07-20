import { useEffect, useState } from 'react';
import { X, Loader2, FileText, Layout, BookOpen, Wrench } from 'lucide-react';
import { flowchartApi, type NodeSummaryData } from '../../lib/flowchartApi';
import './SummaryCard.css';

interface Props {
  nodeId: string;
  nodeLabel: string;
  departmentName?: string;
  onClose: () => void;
}

export default function SummaryCard({ nodeId, nodeLabel, departmentName, onClose }: Props) {
  const [data, setData] = useState<NodeSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchSummary = async () => {
      try {
        const resp = await flowchartApi.getNodeSummary(nodeId, nodeLabel, departmentName);
        if (isMounted) setData(resp);
      } catch {
        if (isMounted) setData({ sops: 0, formats: 0, manuals: 0, equipment: 0 });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSummary();
    return () => { isMounted = false; };
  }, [nodeId, nodeLabel, departmentName]);

  return (
    <div className="hud-summary-bar">
      <div className="hud-header-info">
        <span className="hud-dept-tag">{departmentName || nodeLabel}</span>
        <span className="hud-title">Summary</span>
      </div>

      <div className="hud-divider"></div>

      {loading ? (
        <div className="hud-spinner">
          <Loader2 className="animate-spin text-indigo-400" size={16} />
        </div>
      ) : (
        <div className="hud-metrics">
          <div className="hud-pill sop-pill" title="SOPs">
            <FileText size={14} />
            <span className="hud-value">{data?.sops ?? 0}</span>
            <span className="hud-label">SOPs</span>
          </div>

          <div className="hud-pill format-pill" title="Formats">
            <Layout size={14} />
            <span className="hud-value">{data?.formats ?? 0}</span>
            <span className="hud-label">Formats</span>
          </div>

          <div className="hud-pill manual-pill" title="Manuals">
            <BookOpen size={14} />
            <span className="hud-value">{data?.manuals ?? 0}</span>
            <span className="hud-label">Manuals</span>
          </div>

          <div className="hud-pill equip-pill" title="Equipment">
            <Wrench size={14} />
            <span className="hud-value">{data?.equipment ?? 0}</span>
            <span className="hud-label">Equipment</span>
          </div>
        </div>
      )}

      <button className="hud-close-btn" onClick={onClose} title="Close summary">
        <X size={14} />
      </button>
    </div>
  );
}
