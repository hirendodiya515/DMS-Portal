import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Save, Send, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface AuditEntry {
  id: string;
  title: string;
  docNumber: string;
  observation: string;
  clause: string;
  status: 'OK' | 'AFI' | 'NC' | '';
  ncStatement?: string;
  requirement?: string;
  targetDate?: string;
}

export default function PerformAuditPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scheduleId = searchParams.get('scheduleId');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [schedule, setSchedule] = useState<any>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);

  useEffect(() => {
    if (scheduleId) {
        fetchScheduleContext();
    }
  }, [scheduleId]);

  const fetchScheduleContext = async () => {
      try {
          const [scheduleRes, executionRes] = await Promise.all([
            api.get(`/audit-schedules/${scheduleId}`),
            api.get(`/audit-executions?scheduleId=${scheduleId}`)
          ]);
          
          setSchedule(scheduleRes.data);
          if (scheduleRes.data.date) {
            setDate(new Date(scheduleRes.data.date).toISOString().split('T')[0]);
          }

          if (executionRes.data && executionRes.data.length > 0) {
            const existingExecution = executionRes.data[0];
            setExecutionId(existingExecution.id);
            setEntries(existingExecution.entries || []);
            // Also revert status if needed, but maybe not critical for now
          } else {
             // Initialize with 10 empty rows ONLY if no existing data
             const initialRows = Array.from({ length: 10 }).map(() => ({
                id: crypto.randomUUID(),
                title: '',
                docNumber: '',
                observation: '',
                clause: '',
                status: '' as const,
              }));
              setEntries(initialRows);
          }
      } catch (error) {
          console.error('Failed to fetch data:', error);
          alert('Failed to load details');
      }
  };

  const handleEntryChange = (id: string, field: keyof AuditEntry, value: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const addMoreEntries = () => {
    setEntries(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: '',
        docNumber: '',
        observation: '',
        clause: '',
        status: '' as const,
      }
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'border-2 border-green-500 bg-green-50/30';
      case 'AFI': return 'border-2 border-yellow-500 bg-yellow-50/30';
      case 'NC': return 'border-2 border-red-500 bg-red-50/30';
      default: return 'border border-slate-200';
    }
  };

  const handleSubmit = async (type: 'Draft' | 'Submitted') => {
    if (type === 'Submitted') {
        const filledEntries = entries.filter(e => e.status !== '' && e.title.trim() !== '');
        if (filledEntries.length < 5) {
            alert('At least 5 completed entries are required to submit the audit.');
            return;
        }
        if (!confirm('Are you sure you want to submit? This cannot be undone.')) return;
    }

    setLoading(true);
    try {
        if (executionId) {
            await api.patch(`/audit-executions/${executionId}`, {
                date,
                status: type,
                entries
            });
        } else {
            const res = await api.post('/audit-executions', {
                scheduleId,
                date,
                status: type,
                entries
            });
            setExecutionId(res.data.id);
        }
        alert(`Audit ${type === 'Submitted' ? 'submitted' : 'saved'} successfully!`);
        navigate('/internal-audit/schedule');
    } catch (error) {
        console.error('Failed to save:', error);
        alert('Failed to save audit.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center sticky top-0 bg-slate-50 py-4 z-10 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Perform Audit</h1>
          <p className="text-slate-500 text-sm mt-1">Record observations and findings</p>
        </div>
        <div className="flex items-center gap-3">
             <input 
                type="date"
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                value={date}
                onChange={e => setDate(e.target.value)}
             />
             <button
                onClick={() => handleSubmit('Draft')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
             >
                <Save className="w-4 h-4" />
                Save Draft
             </button>
             <button
                onClick={() => handleSubmit('Submitted')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
             >
                <Send className="w-4 h-4" />
                Submit Audit
             </button>
        </div>
      </div>

      <div className="space-y-4">
        {entries.map((entry, index) => (
            <div key={entry.id} className={`bg-white rounded-xl p-6 transition-all ${getStatusColor(entry.status)} shadow-sm`}>
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-1 flex items-center justify-center font-bold text-slate-400 text-lg">
                        #{index + 1}
                    </div>
                    
                    <div className="col-span-11 space-y-4">
                        {/* Top Row */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                                <input
                                    type="text"
                                    placeholder="Process/Area"
                                    className="w-full px-3 py-2 rounded border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none text-sm"
                                    value={entry.title}
                                    onChange={e => handleEntryChange(entry.id, 'title', e.target.value)}
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Document No</label>
                                <input
                                    type="text"
                                    placeholder="Ref Doc"
                                    className="w-full px-3 py-2 rounded border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none text-sm"
                                    value={entry.docNumber}
                                    onChange={e => handleEntryChange(entry.id, 'docNumber', e.target.value)}
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Clause</label>
                                <input
                                    type="text"
                                    placeholder="ISO Clause"
                                    className="w-full px-3 py-2 rounded border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none text-sm"
                                    value={entry.clause}
                                    onChange={e => handleEntryChange(entry.id, 'clause', e.target.value)}
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                                <select
                                    className={`w-full px-3 py-2 rounded border outline-none text-sm font-medium ${
                                        entry.status === 'OK' ? 'text-green-600 border-green-300 bg-green-50' :
                                        entry.status === 'AFI' ? 'text-yellow-600 border-yellow-300 bg-yellow-50' :
                                        entry.status === 'NC' ? 'text-red-600 border-red-300 bg-red-50' :
                                        'border-slate-300 text-slate-700'
                                    }`}
                                    value={entry.status}
                                    onChange={e => handleEntryChange(entry.id, 'status', e.target.value)}
                                >
                                    <option value="">Select Status</option>
                                    <option value="OK">OK</option>
                                    <option value="AFI">AFI</option>
                                    <option value="NC">NC</option>
                                </select>
                            </div>
                        </div>

                        {/* Observation */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Observation</label>
                            <textarea
                                rows={2}
                                className="w-full px-3 py-2 rounded border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none text-sm"
                                placeholder="Describe findings..."
                                value={entry.observation}
                                onChange={e => handleEntryChange(entry.id, 'observation', e.target.value)}
                            />
                        </div>

                        {/* NC Fields */}
                        {entry.status === 'NC' && (
                            <div className="grid grid-cols-3 gap-4 bg-red-50/50 p-4 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-xs font-semibold text-red-700 mb-1">NC Statement</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded border border-red-200 focus:border-red-500 outline-none text-sm"
                                        value={entry.ncStatement || ''}
                                        onChange={e => handleEntryChange(entry.id, 'ncStatement', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-red-700 mb-1">Requirement</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded border border-red-200 focus:border-red-500 outline-none text-sm"
                                        value={entry.requirement || ''}
                                        onChange={e => handleEntryChange(entry.id, 'requirement', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-red-700 mb-1">Target Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 rounded border border-red-200 focus:border-red-500 outline-none text-sm"
                                        value={entry.targetDate || ''}
                                        onChange={e => handleEntryChange(entry.id, 'targetDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ))}
      </div>

      <div className="flex justify-center pt-6">
        <button
            onClick={addMoreEntries}
            className="flex items-center gap-2 px-6 py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full font-medium transition-colors"
        >
            <Plus className="w-5 h-5" />
            Add More Entries
        </button>
      </div>
    </div>
  );
}
