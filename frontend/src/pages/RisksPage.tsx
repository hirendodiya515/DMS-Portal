import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Shield,
  AlertTriangle,
  Leaf,
  Edit,
  Trash2,
  X,
  Send,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

interface Risk {
  id: string;
  riskNumber: string;
  type: 'qra' | 'hira' | 'eaa';
  title: string;
  description: string;
  department: string;
  source: string;
  interestedParties: string;
  area?: string;
  hazard?: string;
  risk?: string;
  aspect?: string;
  impact?: string;
  failureMode?: string;
  potentialImpact?: string;
  likelihood: number;
  severity: number;
  riskRating: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  currentControls: string;
  proposedActions: string;
  residualLikelihood?: number;
  residualSeverity?: number;
  residualRating?: number;
  residualLevel?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'open' | 'under_review' | 'closed';
  owner: { firstName: string; lastName: string };
  reviewer?: { firstName: string; lastName: string };
  reviewDate?: string;
  reviewComments?: string;
  createdAt: string;
}

interface DashboardStats {
  total: number;
  byLevel: { low: number; medium: number; high: number; critical: number };
  byStatus: { draft: number; pending_review: number; open: number; closed: number };
  byType: { qra: number; hira: number; eaa: number };
  matrix: { [key: string]: number };
}

const RISK_TYPES = [
  { value: 'qra', label: 'QRA', fullName: 'Quality Risk Assessment', icon: Shield, color: 'blue', iso: 'ISO 9001' },
  { value: 'hira', label: 'HIRA', fullName: 'Hazard Identification & Risk Assessment', icon: AlertTriangle, color: 'orange', iso: 'ISO 45001' },
  { value: 'eaa', label: 'EAA', fullName: 'Environmental Aspect Assessment', icon: Leaf, color: 'green', iso: 'ISO 14001' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

const getRowBgColor = (level: string) => {
  switch (level) {
    case 'low': return 'bg-green-50 hover:bg-green-100';
    case 'medium': return 'bg-yellow-50 hover:bg-yellow-100';
    case 'high': return 'bg-orange-50 hover:bg-orange-100';
    case 'critical': return 'bg-red-50 hover:bg-red-100';
    default: return 'hover:bg-slate-50';
  }
};

const getLevelBadge = (level: string, rating: number) => {
  const colors = {
    low: 'bg-green-500 text-white',
    medium: 'bg-yellow-500 text-white',
    high: 'bg-orange-500 text-white',
    critical: 'bg-red-500 text-white',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${colors[level] || 'bg-gray-500 text-white'}`}>
      {rating}
    </span>
  );
};

const getStatusBadge = (status: string) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-700',
    pending_review: 'bg-purple-100 text-purple-700',
    approved: 'bg-blue-100 text-blue-700',
    open: 'bg-emerald-100 text-emerald-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function RisksPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('qra');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [editMode, setEditMode] = useState(false);

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, filterLevel, filterStatus, filterDept, searchTerm]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/settings/departments');
      setDepartments(res.data || ['HR', 'IT', 'Finance', 'Operations', 'Quality', 'EHS', 'Production']);
    } catch {
      setDepartments(['HR', 'IT', 'Finance', 'Operations', 'Quality', 'EHS', 'Production']);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [risksRes, statsRes] = await Promise.all([
        api.get('/risks', {
          params: {
            type: activeTab,
            level: filterLevel,
            status: filterStatus,
            department: filterDept,
            search: searchTerm,
          },
        }),
        api.get('/risks/dashboard', { params: { type: activeTab } }),
      ]);
      setRisks(risksRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching risks:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;
    try {
      await api.delete(`/risks/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete');
    }
  };

  const handleSubmitForReview = async (id: string) => {
    try {
      await api.post(`/risks/${id}/submit`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/risks/${id}/approve`, {});
      fetchData();
      setShowDetailModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    const comments = prompt('Enter rejection comments:');
    if (comments === null) return;
    try {
      await api.post(`/risks/${id}/reject`, { reviewComments: comments });
      fetchData();
      setShowDetailModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject');
    }
  };

  const activeType = RISK_TYPES.find(t => t.value === activeTab);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Risk Register</h1>
        <p className="text-slate-500 mt-1">Manage QRA, HIRA, and EAA assessments</p>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 mb-6">
        {RISK_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = activeTab === type.value;
          return (
            <button
              key={type.value}
              onClick={() => { setActiveTab(type.value); setFilterLevel('all'); }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                isActive
                  ? `bg-${type.color}-500 text-white shadow-lg`
                  : `bg-white text-slate-600 border border-slate-200 hover:bg-slate-50`
              }`}
              style={isActive ? { backgroundColor: type.color === 'blue' ? '#3b82f6' : type.color === 'orange' ? '#f97316' : '#22c55e' } : {}}
            >
              <Icon className="w-5 h-5" />
              <span>{type.label}</span>
              <span className="text-xs opacity-75">({type.iso})</span>
            </button>
          );
        })}
      </div>

      {/* Stats Cards - Clickable Filters */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setFilterLevel('all')}
            className={`p-4 rounded-xl border transition-all ${
              filterLevel === 'all' ? 'ring-2 ring-blue-500 bg-white' : 'bg-white border-slate-200 hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-sm text-slate-500">Total</div>
          </button>
          <button
            onClick={() => setFilterLevel('low')}
            className={`p-4 rounded-xl border transition-all ${
              filterLevel === 'low' ? 'ring-2 ring-green-500 bg-green-50' : 'bg-green-50 border-green-200 hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold text-green-700">{stats.byLevel.low}</div>
            <div className="text-sm text-green-600">🟢 Low (1-4)</div>
          </button>
          <button
            onClick={() => setFilterLevel('medium')}
            className={`p-4 rounded-xl border transition-all ${
              filterLevel === 'medium' ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'bg-yellow-50 border-yellow-200 hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold text-yellow-700">{stats.byLevel.medium}</div>
            <div className="text-sm text-yellow-600">🟡 Medium (5-9)</div>
          </button>
          <button
            onClick={() => setFilterLevel('high')}
            className={`p-4 rounded-xl border transition-all ${
              filterLevel === 'high' ? 'ring-2 ring-orange-500 bg-orange-50' : 'bg-orange-50 border-orange-200 hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold text-orange-700">{stats.byLevel.high}</div>
            <div className="text-sm text-orange-600">🟠 High (10-16)</div>
          </button>
          <button
            onClick={() => setFilterLevel('critical')}
            className={`p-4 rounded-xl border transition-all ${
              filterLevel === 'critical' ? 'ring-2 ring-red-500 bg-red-50' : 'bg-red-50 border-red-200 hover:shadow'
            }`}
          >
            <div className="text-2xl font-bold text-red-700">{stats.byLevel.critical}</div>
            <div className="text-sm text-red-600">🔴 Critical (17-25)</div>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search risks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg"
        >
          <option value="all">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        {(user?.role === 'admin' || user?.role === 'compliance_manager') && (
          <button
            onClick={() => { setEditMode(false); setSelectedRisk(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            New {activeType?.label} Risk
          </button>
        )}
      </div>

      {/* Risks Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : risks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No risks found</h3>
          <p className="text-slate-400">Create your first {activeType?.label} risk assessment</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Dept</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">L×S</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {risks.map((risk) => (
                <tr key={risk.id} className={`${getRowBgColor(risk.riskLevel)} transition-colors`}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-600">{risk.riskNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{risk.title}</div>
                    <div className="text-sm text-slate-500 line-clamp-1">{risk.description}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{risk.department || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium">{risk.likelihood}×{risk.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getLevelBadge(risk.riskLevel, risk.riskRating)}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(risk.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setSelectedRisk(risk); setShowDetailModal(true); }}
                        className="p-2 text-slate-600 hover:bg-white/50 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {risk.status === 'draft' && (
                        <>
                          <button
                            onClick={() => { setSelectedRisk(risk); setEditMode(true); setShowCreateModal(true); }}
                            className="p-2 text-blue-600 hover:bg-white/50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSubmitForReview(risk.id)}
                            className="p-2 text-purple-600 hover:bg-white/50 rounded"
                            title="Submit for Review"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(risk.id)}
                            className="p-2 text-red-600 hover:bg-white/50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <RiskFormModal
          type={activeTab as 'qra' | 'hira' | 'eaa'}
          risk={editMode ? selectedRisk : null}
          departments={departments}
          onClose={() => { setShowCreateModal(false); setSelectedRisk(null); setEditMode(false); }}
          onSuccess={() => { setShowCreateModal(false); fetchData(); }}
        />
      )}

      {/* Detail/Review Modal */}
      {showDetailModal && selectedRisk && (
        <RiskDetailModal
          risk={selectedRisk}
          user={user}
          onClose={() => { setShowDetailModal(false); setSelectedRisk(null); }}
          onApprove={() => handleApprove(selectedRisk.id)}
          onReject={() => handleReject(selectedRisk.id)}
        />
      )}
    </div>
  );
}

// Risk Form Modal
function RiskFormModal({
  type,
  risk,
  departments,
  onClose,
  onSuccess,
}: {
  type: 'qra' | 'hira' | 'eaa';
  risk: Risk | null;
  departments: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    type,
    title: risk?.title || '',
    description: risk?.description || '',
    department: risk?.department || '',
    source: risk?.source || '',
    interestedParties: risk?.interestedParties || '',
    likelihood: risk?.likelihood || 3,
    severity: risk?.severity || 3,
    currentControls: risk?.currentControls || '',
    proposedActions: risk?.proposedActions || '',
    residualLikelihood: risk?.residualLikelihood || undefined,
    residualSeverity: risk?.residualSeverity || undefined,
    area: risk?.area || '',
    hazard: risk?.hazard || '',
    risk: risk?.risk || '',
    aspect: risk?.aspect || '',
    impact: risk?.impact || '',
    failureMode: risk?.failureMode || '',
    potentialImpact: risk?.potentialImpact || '',
    reviewDate: risk?.reviewDate ? format(new Date(risk.reviewDate), 'yyyy-MM-dd') : '',
  });
  const [loading, setLoading] = useState(false);

  const riskRating = formData.likelihood * formData.severity;
  const residualRating = (formData.residualLikelihood && formData.residualSeverity)
    ? formData.residualLikelihood * formData.residualSeverity
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        department: formData.department || undefined,
        source: formData.source || undefined,
        interestedParties: formData.interestedParties || undefined,
        likelihood: Number(formData.likelihood),
        severity: Number(formData.severity),
        currentControls: formData.currentControls || undefined,
        proposedActions: formData.proposedActions || undefined,
        area: formData.area || undefined,
        hazard: formData.hazard || undefined,
        risk: formData.risk || undefined,
        aspect: formData.aspect || undefined,
        impact: formData.impact || undefined,
        failureMode: formData.failureMode || undefined,
        potentialImpact: formData.potentialImpact || undefined,
      };

      // Only include residual risk if both are set
      if (formData.residualLikelihood) {
        payload.residualLikelihood = Number(formData.residualLikelihood);
      }
      if (formData.residualSeverity) {
        payload.residualSeverity = Number(formData.residualSeverity);
      }

      // Only include reviewDate if it's a valid date
      if (formData.reviewDate) {
        payload.reviewDate = formData.reviewDate;
      }

      if (risk) {
        await api.patch(`/risks/${risk.id}`, payload);
      } else {
        await api.post('/risks', payload);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving risk:', error);
      const message = error.response?.data?.message;
      alert(Array.isArray(message) ? message.join(', ') : (message || 'Failed to save risk'));
    } finally {
      setLoading(false);
    }
  };

  const typeInfo = RISK_TYPES.find(t => t.value === type);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {risk ? 'Edit' : 'New'} {typeInfo?.label} Risk
            </h2>
            <p className="text-sm text-slate-500">{typeInfo?.fullName} ({typeInfo?.iso})</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {type === 'qra' ? 'Risk category' : 'Activity'} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {type === 'qra' ? 'Risk description' : 'Task'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {type === 'qra' ? 'Process / Area' : 'Area/work station'}
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            {type === 'hira' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hazard</label>
                  <input
                    type="text"
                    value={formData.hazard}
                    onChange={(e) => setFormData({ ...formData, hazard: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Risk</label>
                  <input
                    type="text"
                    value={formData.risk}
                    onChange={(e) => setFormData({ ...formData, risk: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </>
            )}
            {type === 'eaa' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Aspect</label>
                  <input
                    type="text"
                    value={formData.aspect}
                    onChange={(e) => setFormData({ ...formData, aspect: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Impact</label>
                  <input
                    type="text"
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </>
            )}
            {type === 'qra' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Failure mode</label>
                  <input
                    type="text"
                    value={formData.failureMode}
                    onChange={(e) => setFormData({ ...formData, failureMode: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Potential Impact</label>
                  <input
                    type="text"
                    value={formData.potentialImpact}
                    onChange={(e) => setFormData({ ...formData, potentialImpact: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                required
              >
                <option value="">Select</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., Audit, Incident, Observation"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-medium text-slate-700 mb-3">Initial Risk Assessment</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Likelihood (1-5)</label>
                <select
                  value={formData.likelihood}
                  onChange={(e) => setFormData({ ...formData, likelihood: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Severity (1-5)</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Rating</label>
                <div className={`px-3 py-2 rounded-lg font-bold text-center ${
                  riskRating <= 4 ? 'bg-green-100 text-green-700' :
                  riskRating <= 9 ? 'bg-yellow-100 text-yellow-700' :
                  riskRating <= 16 ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {riskRating}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Controls</label>
            <textarea
              value={formData.currentControls}
              onChange={(e) => setFormData({ ...formData, currentControls: e.target.value })}
              rows={2}
              placeholder="Existing mitigation measures"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proposed Actions</label>
            <textarea
              value={formData.proposedActions}
              onChange={(e) => setFormData({ ...formData, proposedActions: e.target.value })}
              rows={2}
              placeholder="Additional actions needed"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Residual Risk */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-slate-700 mb-3">Residual Risk (After Controls)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Likelihood</label>
                <select
                  value={formData.residualLikelihood || ''}
                  onChange={(e) => setFormData({ ...formData, residualLikelihood: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Severity</label>
                <select
                  value={formData.residualSeverity || ''}
                  onChange={(e) => setFormData({ ...formData, residualSeverity: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Rating</label>
                <div className={`px-3 py-2 rounded-lg font-bold text-center ${
                  !residualRating ? 'bg-gray-100 text-gray-500' :
                  residualRating <= 4 ? 'bg-green-100 text-green-700' :
                  residualRating <= 9 ? 'bg-yellow-100 text-yellow-700' :
                  residualRating <= 16 ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {residualRating || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : (risk ? 'Update' : 'Create')} Risk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Risk Detail Modal
function RiskDetailModal({
  risk,
  user,
  onClose,
  onApprove,
  onReject,
}: {
  risk: Risk;
  user: any;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const canReview = risk.status === 'pending_review' && 
    (user?.role === 'admin' || user?.role === 'dept_head' || user?.role === 'compliance_manager');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{risk.riskNumber} - {risk.title}</h2>
            <p className="text-sm text-slate-500">{RISK_TYPES.find(t => t.value === risk.type)?.fullName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-slate-500">Department</span>
              <p className="font-medium">{risk.department || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">
                {risk.type === 'qra' ? 'Process / Area' : 'Area/work station'}
              </span>
              <p className="font-medium">{risk.area || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">Status</span>
              <p>{getStatusBadge(risk.status)}</p>
            </div>
          </div>

          <div>
            <span className="text-sm text-slate-500">
              {risk.type === 'qra' ? 'Risk description' : 'Task'}
            </span>
            <p className="mt-1">{risk.description || '-'}</p>
          </div>

          {risk.type === 'hira' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-500">Hazard</span>
                <p className="mt-1">{risk.hazard || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-slate-500">Risk</span>
                <p className="mt-1">{risk.risk || '-'}</p>
              </div>
            </div>
          )}
          {risk.type === 'eaa' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-500">Aspect</span>
                <p className="mt-1">{risk.aspect || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-slate-500">Impact</span>
                <p className="mt-1">{risk.impact || '-'}</p>
              </div>
            </div>
          )}
          {risk.type === 'qra' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-500">Failure mode</span>
                  <p className="mt-1">{risk.failureMode || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Potential Impact</span>
                  <p className="mt-1">{risk.potentialImpact || '-'}</p>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
            <div>
              <span className="text-sm text-slate-500">Initial Risk</span>
              <p className="font-bold text-lg">{risk.likelihood}×{risk.severity} = {risk.riskRating}</p>
            </div>
            {risk.residualRating && (
              <div>
                <span className="text-sm text-slate-500">Residual Risk</span>
                <p className="font-bold text-lg">{risk.residualLikelihood}×{risk.residualSeverity} = {risk.residualRating}</p>
              </div>
            )}
          </div>

          <div>
            <span className="text-sm text-slate-500">Current Controls</span>
            <p className="mt-1">{risk.currentControls || '-'}</p>
          </div>

          <div>
            <span className="text-sm text-slate-500">Proposed Actions</span>
            <p className="mt-1">{risk.proposedActions || '-'}</p>
          </div>

          {canReview && (
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={onApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={onReject}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
