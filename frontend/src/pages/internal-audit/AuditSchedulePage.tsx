import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Play, Calendar, User, AlignLeft } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface AuditSchedule {
  id: string;
  department: string;
  date: string;
  scope: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  auditors: { id: string; name: string }[];
}

interface Auditor {
  id: string;
  name: string;
}

export default function AuditSchedulePage() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<AuditSchedule[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AuditSchedule | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    department: '',
    date: '',
    scope: '',
    auditorIds: [] as string[],
  });

  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, departmentsRes, auditorsRes] = await Promise.all([
        api.get('/audit-schedules'),
        api.get('/settings/departments'),
        api.get('/audit-participants?type=auditor'),
      ]);
      setSchedules(schedulesRes.data);
      setDepartments(departmentsRes.data || []);
      setAuditors(auditorsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: AuditSchedule) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        department: item.department,
        date: item.date ? new Date(item.date).toISOString().split('T')[0] : '', // Format YYYY-MM-DD
        scope: item.scope,
        auditorIds: item.auditors?.map(a => a.id) || [],
      });
    } else {
      setEditingItem(null);
      setFormData({
        department: '',
        date: '',
        scope: '',
        auditorIds: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.auditorIds.length === 0) {
        alert('Please select at least one auditor');
        return;
    }
    if (formData.auditorIds.length > 2) {
        alert('You can select maximum 2 auditors');
        return;
    }

    try {
      if (editingItem) {
        await api.patch(`/audit-schedules/${editingItem.id}`, formData);
      } else {
        await api.post('/audit-schedules', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      alert('Failed to save. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.delete(`/audit-schedules/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };
  
  const toggleAuditorSelection = (id: string) => {
      setFormData(prev => {
          if (prev.auditorIds.includes(id)) {
              return { ...prev, auditorIds: prev.auditorIds.filter(aid => aid !== id) };
          }
          if (prev.auditorIds.length >= 2) {
              return prev; // Max 2
          }
          return { ...prev, auditorIds: [...prev.auditorIds, id] };
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Internal Audit Schedule</h1>
          <p className="text-slate-500 text-sm mt-1">Plan and manage upcoming internal audits</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Schedule
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">Schedule Date</th>
              <th className="px-6 py-3">Department</th>
              <th className="px-6 py-3">Scope</th>
              <th className="px-6 py-3">Auditors</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 font-medium text-slate-700">
                    {new Date(item.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-3 text-slate-600">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {item.department}
                    </span>
                </td>
                <td className="px-6 py-3 text-slate-600 max-w-xs truncate" title={item.scope}>{item.scope}</td>
                <td className="px-6 py-3 text-slate-600">
                    <div className="flex flex-col gap-1">
                        {item.auditors?.map(a => (
                            <div key={a.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                                <User className="w-3 h-3 text-slate-400" />
                                {a.name}
                            </div>
                        ))}
                    </div>
                </td>
                <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        item.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                        {item.status}
                    </span>
                </td>
                <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                            <>
                                <button 
                                    onClick={() => handleOpenModal(item)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
                                    title="Edit"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        {(isAdmin || item.status !== 'Completed') && (
                            <button 
                                className="p-1.5 hover:bg-blue-50 bg-slate-50 rounded text-slate-400 hover:text-blue-600 transition-colors border border-slate-200"
                                title={item.status === 'Completed' ? 'Review Audit' : 'Perform Audit'}
                                onClick={() => navigate(`/internal-audit/perform?scheduleId=${item.id}`)}
                            >
                                <Play className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No schedules found.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 transition-opacity" onClick={() => setIsModalOpen(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingItem ? 'Edit' : 'Create'} Audit Schedule
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
                  <select
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                  >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                  <div className="relative">
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                      />
                      <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Auditors (Max 2)</label>
                    <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50 space-y-2">
                        {auditors.map(auditor => (
                            <label key={auditor.id} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                formData.auditorIds.includes(auditor.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-white border border-transparent'
                            }`}>
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    checked={formData.auditorIds.includes(auditor.id)}
                                    onChange={() => toggleAuditorSelection(auditor.id)}
                                    disabled={!formData.auditorIds.includes(auditor.id) && formData.auditorIds.length >= 2}
                                />
                                <span className="text-sm font-medium text-slate-700">{auditor.name}</span>
                            </label>
                        ))}
                        {auditors.length === 0 && <div className="text-xs text-slate-500 p-2">No auditors found. Please add them in Auditors page first.</div>}
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Scope of Audit</label>
                  <div className="relative">
                      <textarea
                        required
                        rows={4}
                        placeholder="Define the scope..."
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder:text-slate-400"
                        value={formData.scope}
                        onChange={e => setFormData({ ...formData, scope: e.target.value })}
                      />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Save Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
