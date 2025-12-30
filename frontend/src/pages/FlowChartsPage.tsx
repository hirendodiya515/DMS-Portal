import { useEffect, useState } from 'react';
import { 
  GitMerge, 
  GitPullRequest, 
  Plus, 
  Search, 
  Trash2,
  Edit,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import CreateDocumentModal from '../components/CreateDocumentModal';

interface ChartDocument {
  id: string;
  title: string;
  description: string;
  type: 'org_chart' | 'process_flow';
  updatedAt: string;
  status: string;
}

export default function FlowChartsPage() {
  const navigate = useNavigate();
  const [charts, setCharts] = useState<ChartDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchCharts();
  }, []);

  const fetchCharts = async () => {
    try {
      // Filter for charts only
      // Ideally backend would support multiple types filter or we filter client side
      const response = await api.get('/documents');
      const allDocs = response.data;
      const chartDocs = allDocs.filter((d: any) => 
        d.type === 'org_chart' || d.type === 'process_flow'
      );
      setCharts(chartDocs);
    } catch (error) {
      console.error('Failed to fetch charts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.delete(`/documents/${id}`);
      setCharts(charts.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete chart:', error);
      alert('Failed to delete chart');
    }
  };

  const filteredCharts = charts.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Charts & Flows</h1>
          <p className="text-slate-500 mt-1">Design and manage organization charts and process flows</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition shadow-lg shadow-blue-500/30 font-medium"
        >
          <Plus className="w-5 h-5" />
          Create New Chart
        </button>
      </div>

      <CreateDocumentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchCharts}
        defaultType="org_chart"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search charts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm h-48 animate-pulse p-6">
              <div className="h-6 bg-slate-100 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
            </div>
          ))
        ) : filteredCharts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <GitMerge className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">No charts found</p>
            <p className="text-sm mt-1">Create your first Org Chart or Process Flow to get started</p>
          </div>
        ) : (
          filteredCharts.map(chart => (
            <div key={chart.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${chart.type === 'org_chart' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                    {chart.type === 'org_chart' ? <GitMerge className="w-6 h-6" /> : <GitPullRequest className="w-6 h-6" />}
                  </div>
                  <div className="flex bg-slate-100 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => navigate(`/charts/editor/${chart.id}`)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md transition"
                      title="Edit Chart"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(chart.id, chart.title)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-md transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {chart.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2">{chart.description || 'No description'}</p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                    {chart.type.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize ${
                    chart.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {chart.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Updated {format(new Date(chart.updatedAt), 'MMM d, yyyy')}
                </span>
                <button 
                  onClick={() => navigate(`/charts/editor/${chart.id}`)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Open Builder
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
