import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import api from '../lib/api';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

interface Measurement {
  id: string;
  actualValue: number;
  measurementDate: string;
  remarks?: string;
}

interface Objective {
  id: string;
  objectiveNumber: string;
  name: string;
  description: string;
  type: 'quality' | 'environmental' | 'safety';
  department: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  uom: string;
  frequency: string;
  target: number;
  higherIsBetter: boolean;
  owner: { firstName: string; lastName: string };
  measurements: Measurement[];
  latestValue?: number | null;
  progress?: number;
  progressStatus?: string;
  createdAt: string;
}

interface DashboardStats {
  summary: {
    total: number;
    active: number;
    completed: number;
    onTrack: number;
    atRisk: number;
    behind: number;
  };
  byType: {
    quality: number;
    environmental: number;
    safety: number;
  };
  objectives: Objective[];
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const DEFAULT_UOM_LIST = ['Number', 'Percentage', 'Currency', 'Days', 'Count', 'Rating'];

// Get current financial year months (April to March)
function getFinancialYearMonths(): { month: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  // FY starts in April (month 3)
  // If we're in Jan-Mar, FY started previous year
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12; // Start from April (3)
    const year = monthIndex < 3 ? fyStartYear + 1 : fyStartYear;
    const date = new Date(year, monthIndex, 1);
    months.push({
      month: format(date, 'yyyy-MM'),
      label: format(date, 'MMM'),
    });
  }
  return months;
}

function getFYLabel(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  return `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
}

// Prepare chart data for an objective
function prepareChartData(measurements: Measurement[], target: number) {
  const fyMonths = getFinancialYearMonths();
  
  // Group measurements by month
  const measurementsByMonth: { [key: string]: number[] } = {};
  measurements.forEach((m) => {
    const monthKey = format(parseISO(m.measurementDate), 'yyyy-MM');
    if (!measurementsByMonth[monthKey]) {
      measurementsByMonth[monthKey] = [];
    }
    measurementsByMonth[monthKey].push(Number(m.actualValue));
  });
  
  return fyMonths.map(({ month, label }) => {
    const values = measurementsByMonth[month];
    const avgValue = values && values.length > 0 
      ? values.reduce((a, b) => a + b, 0) / values.length 
      : null;
    
    return {
      month: label,
      value: avgValue,
      target,
    };
  });
}

// Mini sparkline component
function Sparkline({ data, target, higherIsBetter }: { data: any[]; target: number; higherIsBetter: boolean }) {
  const hasData = data.some(d => d.value !== null);
  const latestValue = [...data].reverse().find(d => d.value !== null)?.value;
  const isGood = latestValue !== null && latestValue !== undefined && 
    (higherIsBetter ? latestValue >= target : latestValue <= target);
  
  return (
    <div className="w-32 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={hasData ? (isGood ? '#10b981' : '#ef4444') : '#d1d5db'}
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
          />
          <ReferenceLine y={target} stroke="#94a3b8" strokeDasharray="2 2" strokeWidth={1} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [uomList, setUomList] = useState<string[]>(DEFAULT_UOM_LIST);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterType, filterStatus, searchTerm]);

  const fetchMasterData = async () => {
    try {
      const [deptRes, uomRes] = await Promise.all([
        api.get('/settings/departments'),
        api.get('/settings/uom_list'),
      ]);
      setDepartments(deptRes.data || ['HR', 'IT', 'Finance', 'Operations', 'Quality']);
      setUomList(uomRes.data?.length > 0 ? uomRes.data : DEFAULT_UOM_LIST);
    } catch (error) {
      console.error('Error fetching master data:', error);
      setDepartments(['HR', 'IT', 'Finance', 'Operations', 'Quality']);
      setUomList(DEFAULT_UOM_LIST);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const dashboardRes = await api.get('/objectives/dashboard', {
        params: { type: filterType, status: filterStatus, search: searchTerm },
      });
      setObjectives(dashboardRes.data.objectives || []);
      setDashboardStats(dashboardRes.data);
    } catch (error) {
      console.error('Error fetching objectives:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quality': return 'bg-blue-100 text-blue-800';
      case 'environmental': return 'bg-green-100 text-green-800';
      case 'safety': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressIcon = (status?: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'on_track': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'at_risk': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'behind': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this objective?')) return;
    try {
      await api.delete(`/objectives/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting objective:', error);
    }
  };

  const handleEdit = (objective: Objective) => {
    setSelectedObjective(objective);
    setShowEditModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Objectives & KPIs</h1>
        <p className="text-slate-500 mt-1">Track and monitor organizational objectives • {getFYLabel()}</p>
      </div>

      {/* Stats Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">{dashboardStats.summary.total}</div>
            <div className="text-sm text-slate-500">Total Objectives</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-emerald-600">{dashboardStats.summary.active}</div>
            <div className="text-sm text-slate-500">Active</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-blue-600">{dashboardStats.summary.onTrack}</div>
            <div className="text-sm text-slate-500">On Track</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-yellow-600">{dashboardStats.summary.atRisk}</div>
            <div className="text-sm text-slate-500">At Risk</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-red-600">{dashboardStats.summary.behind}</div>
            <div className="text-sm text-slate-500">Behind</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-600">{dashboardStats.summary.completed}</div>
            <div className="text-sm text-slate-500">Completed</div>
          </div>
        </div>
      )}

      {/* Type Distribution */}
      {dashboardStats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{dashboardStats.byType.quality}</div>
                <div className="text-blue-100">Quality (ISO 9001)</div>
              </div>
              <Target className="w-10 h-10 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{dashboardStats.byType.environmental}</div>
                <div className="text-green-100">Environmental (ISO 14001)</div>
              </div>
              <Target className="w-10 h-10 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{dashboardStats.byType.safety}</div>
                <div className="text-orange-100">Safety (ISO 45001)</div>
              </div>
              <Target className="w-10 h-10 text-orange-200" />
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search objectives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="quality">Quality</option>
          <option value="environmental">Environmental</option>
          <option value="safety">Safety</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(user?.role === 'admin' || user?.role === 'compliance_manager') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Objective
          </button>
        )}
      </div>

      {/* Objectives Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : objectives.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No objectives found</h3>
          <p className="text-slate-400">Create your first objective to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Trend</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {objectives.map((objective) => {
                const chartData = prepareChartData(objective.measurements || [], objective.target);
                const isExpanded = expandedRows.has(objective.id);
                
                return (
                  <>
                    <tr key={objective.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleExpand(objective.id)}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm text-slate-500">{objective.objectiveNumber}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-slate-800">{objective.name || '-'}</div>
                          <div className="text-sm text-slate-500 line-clamp-1">{objective.description}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(objective.type)}`}>
                          {objective.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{objective.department || '-'}</td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <span className="font-medium">{objective.target}</span>
                          <span className="text-slate-500 ml-1">({objective.uom})</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {objective.higherIsBetter ? '↑ Higher' : '↓ Lower'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-800">
                            {objective.latestValue !== null && objective.latestValue !== undefined 
                              ? objective.latestValue 
                              : <span className="text-slate-400">-</span>
                            }
                          </span>
                          {getProgressIcon(objective.progressStatus)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Sparkline 
                          data={chartData} 
                          target={objective.target} 
                          higherIsBetter={objective.higherIsBetter} 
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(objective.status)}`}>
                          {objective.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedObjective(objective);
                              setShowMeasurementModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Add Measurement"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {(user?.role === 'admin' || user?.role === 'compliance_manager') && (
                            <>
                              <button
                                onClick={() => handleEdit(objective)}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(objective.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row with Full Chart */}
                    {isExpanded && (
                      <tr key={`${objective.id}-chart`}>
                        <td colSpan={10} className="px-6 py-4 bg-slate-50">
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-slate-700">
                                {objective.name} - {getFYLabel()} Performance
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <span className="w-3 h-0.5 bg-blue-500"></span> Actual
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-3 h-0.5 bg-red-500 border-dashed border-t-2 border-red-500"></span> Target ({objective.target})
                                </span>
                              </div>
                            </div>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis 
                                    dataKey="month" 
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    domain={['auto', 'auto']}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#fff',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    }}
                                    formatter={(value: any) => value !== null ? [value, 'Actual'] : ['No data', '']}
                                  />
                                  <ReferenceLine 
                                    y={objective.target} 
                                    stroke="#ef4444" 
                                    strokeDasharray="5 5" 
                                    strokeWidth={2}
                                    label={{ value: 'Target', position: 'right', fill: '#ef4444', fontSize: 12 }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: '#3b82f6' }}
                                    connectNulls={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            {chartData.every(d => d.value === null) && (
                              <div className="text-center text-slate-400 mt-2">
                                No measurements recorded for this financial year
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Objective Modal */}
      {showCreateModal && (
        <ObjectiveFormModal
          mode="create"
          departments={departments}
          uomList={uomList}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}

      {/* Edit Objective Modal */}
      {showEditModal && selectedObjective && (
        <ObjectiveFormModal
          mode="edit"
          objective={selectedObjective}
          departments={departments}
          uomList={uomList}
          onClose={() => {
            setShowEditModal(false);
            setSelectedObjective(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedObjective(null);
            fetchData();
          }}
        />
      )}

      {/* Add Measurement Modal */}
      {showMeasurementModal && selectedObjective && (
        <AddMeasurementModal
          objective={selectedObjective}
          onClose={() => {
            setShowMeasurementModal(false);
            setSelectedObjective(null);
          }}
          onSuccess={() => {
            setShowMeasurementModal(false);
            setSelectedObjective(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// Unified Create/Edit Objective Modal Component
function ObjectiveFormModal({ 
  mode,
  objective,
  departments,
  uomList,
  onClose, 
  onSuccess 
}: { 
  mode: 'create' | 'edit';
  objective?: Objective;
  departments: string[];
  uomList: string[];
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: objective?.name || '',
    description: objective?.description || '',
    type: (objective?.type as string) || 'quality',
    department: objective?.department || '',
    uom: objective?.uom || (uomList.length > 0 ? uomList[0] : 'Number'),
    frequency: objective?.frequency || 'monthly',
    target: objective?.target?.toString() || '',
    higherIsBetter: objective?.higherIsBetter ?? true,
    status: (objective?.status as string) || 'active',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        target: parseFloat(formData.target),
      };

      if (mode === 'create') {
        await api.post('/objectives', payload);
      } else {
        await api.patch(`/objectives/${objective?.id}`, payload);
      }
      onSuccess();
    } catch (error) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} objective:`, error);
      alert(`Failed to ${mode === 'create' ? 'create' : 'update'} objective`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-800">
            {mode === 'create' ? 'Create New Objective' : 'Edit Objective'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Customer Satisfaction Rate"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="quality">Quality (ISO 9001)</option>
                <option value="environmental">Environmental (ISO 14001)</option>
                <option value="safety">Safety (ISO 45001)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UOM *</label>
              <select
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {uomList.map((uom) => (
                  <option key={uom} value={uom}>{uom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency *</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target *</label>
            <input
              type="number"
              step="0.01"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              placeholder="e.g., 95"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="higherIsBetter"
              checked={formData.higherIsBetter}
              onChange={(e) => setFormData({ ...formData, higherIsBetter: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="higherIsBetter" className="text-sm text-slate-700">
              Higher value is better (uncheck for metrics like defects)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (mode === 'create' ? 'Create Objective' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Measurement Modal Component
function AddMeasurementModal({
  objective,
  onClose,
  onSuccess,
}: {
  objective: Objective;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    actualValue: '',
    measurementDate: format(new Date(), 'yyyy-MM-dd'),
    remarks: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/objectives/${objective.id}/measurements`, {
        ...formData,
        actualValue: parseFloat(formData.actualValue),
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding measurement:', error);
      alert('Failed to add measurement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Record Measurement</h2>
            <p className="text-sm text-slate-500 mt-1">{objective.name}</p>
            <p className="text-xs text-slate-400">
              Target: {objective.target} {objective.uom} | {objective.higherIsBetter ? '↑ Higher' : '↓ Lower'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Actual Value *</label>
            <input
              type="number"
              step="0.01"
              value={formData.actualValue}
              onChange={(e) => setFormData({ ...formData, actualValue: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input
              type="date"
              value={formData.measurementDate}
              onChange={(e) => setFormData({ ...formData, measurementDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={2}
              placeholder="Optional notes"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
