import { useEffect, useState } from 'react';
import {
  Plus,
  BarChart2,
  List,
  Target,
  Activity,
  X,
  Trash2,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { v4 as uuidv4 } from 'uuid';
import type { Objective, Measurement } from '../types/objective';

// Import sub components
import { ObjectivesList } from './objectives/ObjectivesList';
import { ObjectivesHighlights } from './objectives/ObjectivesHighlights';
import { ObjectivesLogs } from './objectives/ObjectivesLogs';
import { ObjectiveDetailView } from './objectives/ObjectiveDetailView';
import { ObjectivesTracking } from './objectives/ObjectivesTracking';

export const FY_MONTH_KEYS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export function getCurrentFY(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  return `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
}

export function getFYOptions(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentFYStart = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  const options = [];
  for (let i = 1; i >= -3; i--) {
    const startYear = currentFYStart + i;
    options.push(`FY ${startYear}-${(startYear + 1).toString().slice(-2)}`);
  }
  return options;
}

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
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

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [uomList, setUomList] = useState<string[]>(DEFAULT_UOM_LIST);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  
  // Year selector state
  const [selectedFY, setSelectedFY] = useState<string>(getCurrentFY());
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [measurementToEdit, setMeasurementToEdit] = useState<Measurement | null>(null);

  // Tabs and Views
  const [activeTab, setActiveTab] = useState<'highlights' | 'objectives' | 'tracking' | 'logs'>('objectives');
  const [viewingObjective, setViewingObjective] = useState<Objective | null>(null);

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchData(selectedFY);
  }, [selectedFY]);

  const fetchMasterData = async () => {
    try {
      const [deptRes, uomRes, usersRes] = await Promise.all([
        api.get('/settings/departments'),
        api.get('/settings/uom_list'),
        api.get('/users'),
      ]);
      setDepartments(deptRes.data || ['HR', 'IT', 'Finance', 'Operations', 'Quality']);
      setUomList(uomRes.data?.length > 0 ? uomRes.data : DEFAULT_UOM_LIST);
      setUsersList(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
      setDepartments(['HR', 'IT', 'Finance', 'Operations', 'Quality']);
      setUomList(DEFAULT_UOM_LIST);
    }
  };

  const fetchData = async (fy?: string) => {
    try {
      setLoading(true);
      const fyClean = fy ? fy.replace('FY ', '') : selectedFY.replace('FY ', '');
      const dashboardRes = await api.get('/objectives/dashboard', {
        params: { financialYear: fyClean === 'all' ? undefined : fyClean },
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

  const handleCarryForward = (objective: Objective) => {
    setSelectedObjective(objective);
    setShowCarryForwardModal(true);
  };

  const handleEditMeasurement = (measurement: Measurement, obj: Objective) => {
    setMeasurementToEdit(measurement);
    setSelectedObjective(obj);
    setShowMeasurementModal(true);
  };

  const handleDeleteMeasurement = async (measurementId: string) => {
    if (!confirm('Are you sure you want to delete this reading?')) return;
    try {
      await api.delete(`/objectives/measurements/${measurementId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting measurement:', error);
    }
  };

  const fyOptions = getFYOptions();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {viewingObjective ? (
        // Detailed View Mode
        <ObjectiveDetailView 
          objective={viewingObjective}
          onBack={() => setViewingObjective(null)}
          onEdit={handleEdit}
          onCarryForward={handleCarryForward}
          onDelete={(id) => {
            handleDelete(id);
            setViewingObjective(null);
          }}
          onAddMeasurement={(obj) => {
            setSelectedObjective(obj);
            setMeasurementToEdit(null);
            setShowMeasurementModal(true);
          }}
          onEditMeasurement={handleEditMeasurement}
          onDeleteMeasurement={handleDeleteMeasurement}
          user={user}
        />
      ) : (
        // Tabbed Mode
        <>
          {/* Header Layout for Tabs & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 leading-tight">Objectives & KPIs</h1>
                <p className="text-sm text-slate-500 mt-1">Track and monitor organizational objectives</p>
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
            
            {/* Header Right Actions: Year Selector + New Objective Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase">Year:</span>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Financial Years</option>
                  {fyOptions.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
              </div>

              {['admin', 'compliance_manager', 'creator', 'reviewer', 'dept_head'].includes(user?.role || '') && (
                <button
                  onClick={() => {
                    setSelectedObjective(null);
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  New Objective
                </button>
              )}
            </div>
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
              selectedFY={selectedFY}
              onViewDetails={(obj) => setViewingObjective(obj)}
              onAddMeasurement={(obj) => {
                setSelectedObjective(obj);
                setMeasurementToEdit(null);
                setShowMeasurementModal(true);
              }}
              onEdit={handleEdit}
              onCarryForward={handleCarryForward}
              onDelete={handleDelete}
              user={user}
            />
          )}

          {activeTab === 'tracking' && (
             <ObjectivesTracking 
               objectives={objectives} 
               loading={loading}
               departments={departments}
               selectedFY={selectedFY}
               onViewDetails={(obj) => setViewingObjective(obj)}
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
          usersList={usersList}
          uomList={uomList}
          defaultFY={selectedFY === 'all' ? getCurrentFY() : selectedFY}
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
          usersList={usersList}
          uomList={uomList}
          defaultFY={selectedObjective.financialYear ? `FY ${selectedObjective.financialYear}` : getCurrentFY()}
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

      {/* Carry Forward Modal */}
      {showCarryForwardModal && selectedObjective && (
        <CarryForwardModal
          objective={selectedObjective}
          onClose={() => {
            setShowCarryForwardModal(false);
            setSelectedObjective(null);
          }}
          onSuccess={() => {
            setShowCarryForwardModal(false);
            setSelectedObjective(null);
            fetchData();
          }}
        />
      )}

      {/* Add/Edit Measurement Modal */}
      {showMeasurementModal && selectedObjective && (
        <AddMeasurementModal
          objective={selectedObjective}
          measurementToEdit={measurementToEdit}
          onClose={() => {
            setShowMeasurementModal(false);
            setSelectedObjective(null);
            setMeasurementToEdit(null);
          }}
          onSuccess={() => {
            setShowMeasurementModal(false);
            setSelectedObjective(null);
            setMeasurementToEdit(null);
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
  usersList,
  uomList,
  defaultFY,
  onClose, 
  onSuccess 
}: { 
  mode: 'create' | 'edit';
  objective?: Objective;
  departments: string[];
  usersList: UserItem[];
  uomList: string[];
  defaultFY: string;
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const initialFY = objective?.financialYear 
    ? (objective.financialYear.startsWith('FY') ? objective.financialYear : `FY ${objective.financialYear}`)
    : defaultFY;

  const [formData, setFormData] = useState({
    name: objective?.name || '',
    description: objective?.description || '',
    type: (objective?.type as string) || 'quality',
    department: objective?.department || '',
    ownerId: objective?.ownerId || objective?.owner?.id || '',
    financialYear: initialFY.replace('FY ', ''),
    uom: objective?.uom || (uomList.length > 0 ? uomList[0] : 'Number'),
    frequency: objective?.frequency || 'monthly',
    target: objective?.target?.toString() || '',
    higherIsBetter: objective?.higherIsBetter ?? true,
    status: (objective?.status as string) || 'active',
    hasSubTargets: objective?.hasSubTargets ?? false,
    aggregationType: objective?.aggregationType || 'sum',
    subTargets: objective?.subTargets || [] as { id: string; name: string; target: number }[],
    monthlyTargets: objective?.monthlyTargets || FY_MONTH_KEYS.reduce((acc, m) => ({ ...acc, [m]: '' }), {} as Record<string, string | number>),
  });

  const [showMonthlyTargetGrid, setShowMonthlyTargetGrid] = useState(false);
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

  // Apply base target across all months if user updates base target
  const handleBaseTargetChange = (val: string) => {
    setFormData(prev => {
      const newMonthly = { ...prev.monthlyTargets };
      FY_MONTH_KEYS.forEach(m => {
        newMonthly[m] = val;
      });
      return {
        ...prev,
        target: val,
        monthlyTargets: newMonthly
      };
    });
  };

  const handleMonthlyTargetChange = (monthKey: string, val: string) => {
    setFormData(prev => {
      const updated = { ...prev.monthlyTargets, [monthKey]: val };
      const monthIdx = FY_MONTH_KEYS.indexOf(monthKey);
      if (monthIdx !== -1) {
        for (let i = monthIdx + 1; i < FY_MONTH_KEYS.length; i++) {
          const nextKey = FY_MONTH_KEYS[i];
          if (!updated[nextKey] || updated[nextKey] === '') {
            updated[nextKey] = val;
          }
        }
      }
      return { ...prev, monthlyTargets: updated };
    });
  };

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
      const finalMonthlyTargets: Record<string, number> = {};
      let lastVal = parseFloat(formData.target) || 0;

      FY_MONTH_KEYS.forEach(m => {
        const valStr = formData.monthlyTargets[m];
        if (valStr !== undefined && valStr !== null && valStr !== '') {
          const num = parseFloat(valStr.toString());
          if (!isNaN(num)) {
            finalMonthlyTargets[m] = num;
            lastVal = num;
          } else {
            finalMonthlyTargets[m] = lastVal;
          }
        } else {
          finalMonthlyTargets[m] = lastVal;
        }
      });

      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        department: formData.department,
        ownerId: formData.ownerId || undefined,
        financialYear: formData.financialYear,
        uom: formData.uom,
        frequency: formData.frequency,
        target: parseFloat(formData.target) || 0,
        monthlyTargets: finalMonthlyTargets,
        higherIsBetter: formData.higherIsBetter,
        status: formData.status,
        hasSubTargets: formData.hasSubTargets,
        aggregationType: formData.aggregationType,
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

  const fyOptions = getFYOptions();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {mode === 'create' ? 'Create New Objective' : 'Edit Objective'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Assigned for Financial Year {formData.financialYear}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Objective Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Customer Satisfaction Index"
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
              placeholder="Detailed description of objective..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year *</label>
              <select
                value={`FY ${formData.financialYear}`}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value.replace('FY ', '') })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                required
              >
                {fyOptions.map((fy) => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Objective Owner *</label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">Select Owner User</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} {u.department ? `(${u.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">UOM *</label>
                <select
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Base Target */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-slate-800">Target Value *</label>
                <p className="text-xs text-slate-500">Base target or default target applied across months</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthlyTargetGrid(!showMonthlyTargetGrid)}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
              >
                {showMonthlyTargetGrid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showMonthlyTargetGrid ? 'Hide Monthly Targets' : 'Customize Month-by-Month Targets'}
              </button>
            </div>

            <input
              type="number"
              step="0.01"
              value={formData.target}
              onChange={(e) => handleBaseTargetChange(e.target.value)}
              placeholder="e.g. 95"
              className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white ${formData.hasSubTargets ? 'opacity-70 cursor-not-allowed' : ''}`}
              required
              readOnly={formData.hasSubTargets}
            />

            {/* Monthly Targets Grid */}
            {showMonthlyTargetGrid && (
              <div className="pt-3 border-t border-slate-200 animate-in fade-in duration-200">
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Monthly Target Breakdown (FY {formData.financialYear}: Apr - Mar). Cascades to subsequent months if left empty.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {FY_MONTH_KEYS.map((m) => (
                    <div key={m} className="bg-white p-2 rounded-lg border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase text-center mb-1">{m}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.monthlyTargets[m] ?? ''}
                        onChange={(e) => handleMonthlyTargetChange(m, e.target.value)}
                        placeholder={formData.target || '0'}
                        className="w-full text-center px-1 py-1 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="higherIsBetter"
              checked={formData.higherIsBetter}
              onChange={(e) => setFormData({ ...formData, higherIsBetter: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
            <label htmlFor="higherIsBetter" className="text-sm text-slate-700">
              Higher value is better (uncheck for defect / incident reduction KPIs)
            </label>
          </div>

          {/* Sub-Targets / Line-wise */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasSubTargets"
                  checked={formData.hasSubTargets}
                  onChange={(e) => setFormData({ ...formData, hasSubTargets: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="hasSubTargets" className="font-medium text-slate-700 text-sm">
                  Track Sub-Objectives (Line-wise breakdown)
                </label>
              </div>
              {formData.hasSubTargets && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-700">Aggregation:</label>
                    <select
                      value={formData.aggregationType}
                      onChange={(e) => setFormData({ ...formData, aggregationType: e.target.value as 'sum' | 'average' })}
                      className="text-xs border border-slate-200 rounded-md py-1 px-2 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="sum">Sum</option>
                      <option value="average">Average</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubTarget}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line
                  </button>
                </div>
              )}
            </div>

            {formData.hasSubTargets && (
              <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                {formData.subTargets.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Click "Add Line" to define sub-components.</p>
                ) : (
                  formData.subTargets.map((st: any, index: number) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-5">{index + 1}.</span>
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => handleSubTargetChange(st.id, 'name', e.target.value)}
                        placeholder="Line / Sub-target Name"
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={st.target}
                        onChange={(e) => handleSubTargetChange(st.id, 'target', e.target.value)}
                        placeholder="Target"
                        className="w-24 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubTarget(st.id)}
                        className="p-1 text-red-400 hover:text-red-600 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (mode === 'create' ? 'Create Objective' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Carry Forward Objective Modal Component
function CarryForwardModal({
  objective,
  onClose,
  onSuccess,
}: {
  objective: Objective;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const currentFY = objective.financialYear || getCurrentFY().replace('FY ', '');
  const nextFYStart = parseInt(currentFY.split('-')[0], 10) + 1;
  const defaultNextFY = `FY ${nextFYStart}-${(nextFYStart + 1).toString().slice(-2)}`;

  const [targetFY, setTargetFY] = useState(defaultNextFY);
  const [target, setTarget] = useState(objective.target.toString());
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, string | number>>(
    objective.monthlyTargets || FY_MONTH_KEYS.reduce((acc, m) => ({ ...acc, [m]: objective.target }), {} as Record<string, string | number>)
  );
  const [loading, setLoading] = useState(false);

  const fyOptions = getFYOptions();

  const handleCarryForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalMonthly: Record<string, number> = {};
      let lastVal = parseFloat(target) || 0;
      FY_MONTH_KEYS.forEach(m => {
        const valStr = monthlyTargets[m];
        if (valStr !== undefined && valStr !== null && valStr !== '') {
          const num = parseFloat(valStr.toString());
          finalMonthly[m] = !isNaN(num) ? num : lastVal;
          if (!isNaN(num)) lastVal = num;
        } else {
          finalMonthly[m] = lastVal;
        }
      });

      await api.post(`/objectives/${objective.id}/carryforward`, {
        targetFinancialYear: targetFY.replace('FY ', ''),
        target: parseFloat(target) || 0,
        monthlyTargets: finalMonthly,
      });

      onSuccess();
    } catch (error) {
      console.error('Error carrying forward objective:', error);
      alert('Failed to carry forward objective');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-blue-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Carry Forward Objective</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCarryForwardSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase font-semibold">Selected Objective</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{objective.name}</p>
            <p className="text-xs text-slate-500 mt-1">Current Financial Year: <span className="font-semibold text-slate-700">FY {currentFY}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Carry Forward to FY *</label>
            <select
              value={targetFY}
              onChange={(e) => setTargetFY(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
              required
            >
              {fyOptions.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target for New Year *</label>
            <input
              type="number"
              step="0.01"
              value={target}
              onChange={(e) => {
                const val = e.target.value;
                setTarget(val);
                setMonthlyTargets(prev => {
                  const updated = { ...prev };
                  FY_MONTH_KEYS.forEach(m => { updated[m] = val; });
                  return updated;
                });
              }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
              Monthly Targets for {targetFY}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FY_MONTH_KEYS.map((m) => (
                <div key={m} className="bg-slate-50 p-2 rounded border border-slate-200 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">{m}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyTargets[m] ?? ''}
                    onChange={(e) => setMonthlyTargets({ ...monthlyTargets, [m]: e.target.value })}
                    placeholder={target}
                    className="w-full text-center px-1 py-1 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 bg-white mt-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Processing...' : 'Confirm & Carry Forward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add/Edit Measurement Modal Component
function AddMeasurementModal({
  objective,
  measurementToEdit,
  onClose,
  onSuccess,
}: {
  objective: Objective;
  measurementToEdit?: Measurement | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isLineWise = objective.hasSubTargets && objective.subTargets && objective.subTargets.length > 0;
  
  const [formData, setFormData] = useState({
    actualValue: measurementToEdit ? measurementToEdit.actualValue.toString() : '',
    measurementDate: measurementToEdit ? format(new Date(measurementToEdit.measurementDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    remarks: measurementToEdit?.remarks || '',
    subValues: isLineWise 
      ? objective.subTargets!.reduce((acc, st) => {
          const existingSubVal = measurementToEdit?.subValues?.find(sv => sv.subTargetId === st.id);
          return { ...acc, [st.id]: existingSubVal ? existingSubVal.value.toString() : '' };
        }, {} as Record<string, string>)
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

      if (measurementToEdit) {
        await api.patch(`/objectives/measurements/${measurementToEdit.id}`, {
          actualValue: finalActualValue,
          measurementDate: formData.measurementDate,
          remarks: formData.remarks,
          subValues: finalSubValues.length > 0 ? finalSubValues : undefined
        });
      } else {
        await api.post(`/objectives/${objective.id}/measurements`, {
          actualValue: finalActualValue,
          measurementDate: formData.measurementDate,
          remarks: formData.remarks,
          subValues: finalSubValues.length > 0 ? finalSubValues : undefined
        });
      }
      onSuccess();
    } catch (error) {
      console.error(`Error ${measurementToEdit ? 'updating' : 'adding'} measurement:`, error);
      alert(`Failed to ${measurementToEdit ? 'update' : 'add'} measurement`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {measurementToEdit ? 'Edit Reading' : 'Record Measurement'}
            </h2>
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
