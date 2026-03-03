import { useEffect, useState } from 'react';
import {
  Plus,
  BarChart2,
  List,
  Target,
  Activity,
  X,
  Trash2
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { v4 as uuidv4 } from 'uuid';

// Import new components
import { ObjectivesList } from './objectives/ObjectivesList';
import { ObjectivesHighlights } from './objectives/ObjectivesHighlights';
import { ObjectivesLogs } from './objectives/ObjectivesLogs';
import { ObjectiveDetailView } from './objectives/ObjectiveDetailView';
import { ObjectivesTracking } from './objectives/ObjectivesTracking';

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
  measurements: Measurement[];
  latestValue?: number | null;
  progress?: number;
  progressStatus?: string;
  createdAt: string;
  hasSubTargets?: boolean;
  aggregationType?: 'sum' | 'average';
  subTargets?: { id: string; name: string; target?: number }[];
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

function getFYLabel(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  return `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
}

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [uomList, setUomList] = useState<string[]>(DEFAULT_UOM_LIST);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);

  // New states for Tabs and Views
  const [activeTab, setActiveTab] = useState<'highlights' | 'objectives' | 'tracking' | 'logs'>('objectives');
  const [viewingObjective, setViewingObjective] = useState<Objective | null>(null);

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchData();
  }, []); // Fetch all data initially, components handle local filtering

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
        params: { }, // Fetch all data
      });
      const fetchedObjectives = dashboardRes.data.objectives || [];
      setObjectives(fetchedObjectives);
      setDashboardStats(dashboardRes.data);
      
      setViewingObjective(current => {
        if (!current) return null;
        return fetchedObjectives.find((o: any) => o.id === current.id) || current;
      });
    } catch (error) {
      console.error('Error fetching objectives:', error);
    } finally {
      setLoading(false);
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
      {viewingObjective ? (
        // Detailed View Mode
        <ObjectiveDetailView 
          objective={viewingObjective}
          onBack={() => setViewingObjective(null)}
          onEdit={handleEdit}
          onDelete={(id) => {
            handleDelete(id);
            setViewingObjective(null);
          }}
          onAddMeasurement={(obj) => {
            setSelectedObjective(obj);
            setShowMeasurementModal(true);
          }}
          user={user}
        />
      ) : (
        // Tabbed Mode
        <>
          {/* Header Layout for Tabs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 leading-tight">Objectives & KPIs</h1>
                <p className="text-sm text-slate-500 mt-1">Track and monitor organizational objectives • {getFYLabel()}</p>
              </div>
              
              {/* Tabs inline under title */}
              <div className="flex space-x-1 bg-slate-100/50 p-1 rounded-lg border border-slate-200 inline-flex w-fit mt-1">
                <button
                  onClick={() => setActiveTab('highlights')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'highlights'
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  Highlights
                </button>
                <button
                  onClick={() => setActiveTab('objectives')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'objectives'
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Objectives
                </button>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'tracking'
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  Tracking
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'logs'
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Logs
                </button>
              </div>
            </div>
            
            {(!viewingObjective && (
              ['admin', 'compliance_manager', 'creator', 'reviewer', 'dept_head'].includes(user?.role || '')
            )) && (
              <button
                onClick={() => {
                  setSelectedObjective(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm self-start md:self-auto h-fit"
              >
                <Plus className="w-4 h-4" />
                New Objective
              </button>
            )}
          </div>
          {/* Tab Content */}
          {activeTab === 'highlights' && (
            <ObjectivesHighlights stats={dashboardStats} />
          )}

          {activeTab === 'objectives' && (
            <ObjectivesList 
              objectives={objectives}
              loading={loading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterType={filterType}
              setFilterType={setFilterType}
              filterDepartment={filterDepartment}
              setFilterDepartment={setFilterDepartment}
              departments={departments}
              onViewDetails={setViewingObjective}
              onAddMeasurement={(obj) => {
                setSelectedObjective(obj);
                setShowMeasurementModal(true);
              }}
              onEdit={handleEdit}
              onDelete={handleDelete}
              user={user}
            />
          )}

          {activeTab === 'tracking' && (
             <ObjectivesTracking 
               objectives={objectives} 
               loading={loading}
               departments={departments}
               onViewDetails={setViewingObjective}
             />
          )}

          {activeTab === 'logs' && (
             <ObjectivesLogs 
               departments={departments}
               objectives={objectives}
             />
          )}
        </>
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
    hasSubTargets: objective?.hasSubTargets ?? false,
    aggregationType: objective?.aggregationType || 'sum',
    subTargets: objective?.subTargets || [] as { id: string; name: string; target: number }[],
  });
  const [loading, setLoading] = useState(false);

  // Auto-calculate main target whenever subTargets or aggregationType changes
  useEffect(() => {
    if (formData.hasSubTargets && formData.subTargets.length > 0) {
      const total = formData.subTargets.reduce((sum: number, st: any) => sum + (parseFloat(st.target) || 0), 0);
      const calculatedTarget = formData.aggregationType === 'average' 
        ? total / formData.subTargets.length 
        : total;
        
      setFormData(prev => ({
        ...prev,
        target: isNaN(calculatedTarget) ? '' : calculatedTarget.toFixed(2)
      }));
    }
  }, [formData.subTargets, formData.aggregationType, formData.hasSubTargets]);

  const handleAddSubTarget = () => {
    setFormData((prev: any) => ({
      ...prev,
      subTargets: [...prev.subTargets, { id: uuidv4(), name: '', target: '' }]
    }));
  };

  const handleRemoveSubTarget = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      subTargets: prev.subTargets.filter((st: any) => st.id !== id)
    }));
  };

  const handleSubTargetChange = (id: string, field: 'name' | 'target', value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      subTargets: prev.subTargets.map((st: any) => st.id === id ? { ...st, [field]: value } : st)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        target: parseFloat(formData.target),
        subTargets: formData.hasSubTargets ? formData.subTargets.map((st: any) => ({
          ...st,
          target: parseFloat(st.target) || 0
        })) : []
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
                <option value="quality">QMS (ISO 9001)</option>
                <option value="environmental">EMS (ISO 14001)</option>
                <option value="safety">OHSMS (ISO 45001)</option>
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
              className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 ${formData.hasSubTargets ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
              required
              readOnly={formData.hasSubTargets}
            />
            {formData.hasSubTargets && (
              <p className="text-xs text-slate-500 mt-1 italic">Automatically calculated based on sub-targets and aggregation method.</p>
            )}
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
          
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasSubTargets"
                  checked={formData.hasSubTargets}
                  onChange={(e) => setFormData({ ...formData, hasSubTargets: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <label htmlFor="hasSubTargets" className="font-medium text-slate-700">
                  Track Sub-Objectives (Line-wise details)
                </label>
              </div>
              {formData.hasSubTargets && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Aggregation:</label>
                    <select
                      value={formData.aggregationType}
                      onChange={(e) => setFormData({ ...formData, aggregationType: e.target.value as 'sum' | 'average' })}
                      className="text-sm border border-slate-200 rounded-md py-1 px-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sum">Sum</option>
                      <option value="average">Average</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubTarget}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    Add Line
                  </button>
                </div>
              )}
            </div>
            
            {formData.hasSubTargets && (
              <div className="space-y-3 pl-6 border-l-2 border-slate-100">
                {formData.subTargets.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Click "Add Line" to define sub-components.</p>
                ) : (
                  formData.subTargets.map((st: any, index: number) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <span className="text-sm text-slate-400 w-6">{index + 1}.</span>
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => handleSubTargetChange(st.id, 'name', e.target.value)}
                        placeholder="e.g. Line 1"
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={st.target}
                        onChange={(e) => handleSubTargetChange(st.id, 'target', e.target.value)}
                        placeholder="Target"
                        className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubTarget(st.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
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
  const isLineWise = objective.hasSubTargets && objective.subTargets && objective.subTargets.length > 0;
  
  const [formData, setFormData] = useState({
    actualValue: '',
    measurementDate: format(new Date(), 'yyyy-MM-dd'),
    remarks: '',
    subValues: isLineWise 
      ? objective.subTargets!.reduce((acc, st) => ({ ...acc, [st.id]: '' }), {} as Record<string, string>)
      : {}
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubValueChange = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      subValues: { ...prev.subValues, [id]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let finalActualValue = 0;
      let finalSubValues: any[] = [];
      
      if (isLineWise) {
        const valuesArr = Object.values(formData.subValues).map(v => parseFloat(v) || 0);
        const sum = valuesArr.reduce((acc, val) => acc + val, 0);
        
        if (objective.aggregationType === 'average' && valuesArr.length > 0) {
          finalActualValue = sum / valuesArr.length;
        } else {
          finalActualValue = sum;
        }
        
        finalSubValues = Object.entries(formData.subValues).map(([id, val]) => ({
          subTargetId: id,
          value: parseFloat(val) || 0
        }));
      } else {
        finalActualValue = parseFloat(formData.actualValue);
      }

      await api.post(`/objectives/${objective.id}/measurements`, {
        actualValue: finalActualValue,
        measurementDate: formData.measurementDate,
        remarks: formData.remarks,
        subValues: finalSubValues.length > 0 ? finalSubValues : undefined
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
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
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {isLineWise ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Line-wise Breakdown</h3>
                {objective.subTargets!.map(st => (
                  <div key={st.id} className="flex items-center gap-3">
                    <div className="w-1/3">
                      <label className="text-sm font-medium text-slate-600 truncate block" title={st.name}>{st.name}</label>
                      <span className="text-xs text-slate-400 block mt-0.5">Target: {st.target}</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.subValues[st.id] || ''}
                      onChange={(e) => handleSubValueChange(st.id, e.target.value)}
                      placeholder={`Value in ${objective.uom}`}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700">Calculated Total ({objective.aggregationType === 'average' ? 'Avg' : 'Sum'}):</span>
                  <span className="text-lg font-bold text-blue-600">
                    {(() => {
                       const valuesArr = Object.values(formData.subValues).map(v => parseFloat(v) || 0);
                       if (valuesArr.length === 0) return 0;
                       const sum = valuesArr.reduce((acc, val) => acc + val, 0);
                       const result = objective.aggregationType === 'average' ? sum / valuesArr.length : sum;
                       return result.toFixed(2);
                    })()} {objective.uom}
                  </span>
                </div>
              </div>
            ) : (
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
            )}

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
          </div>
          <div className="p-6 border-t border-slate-200 shrink-0 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
