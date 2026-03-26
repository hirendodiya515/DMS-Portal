import { useState, useEffect, useRef } from 'react';
import { Plus, X, QrCode, Users, RefreshCw, Download, Calendar, CheckCircle, Wifi, BarChart3, MessageSquare, Star, ThumbsUp, Lightbulb, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrainingEvent {
  id: string;
  trainingName: string;
  trainingDate: string;
  location: string;
  startTime: string;
  endTime: string;
  qrToken: string;
  isActive: boolean;
  department?: string;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  markedAt: string;
  ipAddress: string;
  syncedFromCloud: boolean;
  department?: string;
  feedback?: any;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TrainingManager() {
  const user = useAuthStore(state => state.user);
  const [competencyAdmins, setCompetencyAdmins] = useState<string[]>([]);
  
  const [subTab, setSubTab] = useState<'calendar' | 'dashboard' | 'attendance' | 'analytics'>('calendar');
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrModal, setQrModal] = useState<{ event: TrainingEvent; qrDataUrl: string; qrUrl: string } | null>(null);
  const [attendanceModal, setAttendanceModal] = useState<{ event: TrainingEvent; records: AttendanceRecord[] } | null>(null);

  const [createForm, setCreateForm] = useState({
    trainingName: '', trainingDate: '', location: '', startTime: '', endTime: '', department: 'All'
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);

  // Analytics State
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('all');
  const [analyticsStartDate, setAnalyticsStartDate] = useState<string>('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Dashboard State
  const [dashStartDate, setDashStartDate] = useState<string>('');
  const [dashEndDate, setDashEndDate] = useState<string>('');

  // Matrix State
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const defaultFY = currentMonth >= 3 ? currentYear : currentYear - 1;
  const [matrixYear, setMatrixYear] = useState<number>(defaultFY);
  const [annualPlans, setAnnualPlans] = useState<any[]>([]);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ topic: '', month: currentMonth, year: currentYear, department: 'All' });

  const qrImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => { 
    loadEvents(); 
    loadMasters(); 
    if (user?.department) {
      setCreateForm(f => ({ ...f, department: isGodMode ? 'All' : user.department! }));
      setPlanForm(f => ({ ...f, department: isGodMode ? 'All' : user.department! }));
    }
  }, [user]);

  const isGodMode = user?.role === 'admin' || (user?.id && competencyAdmins.includes(user.id));
  const isManager = ['creator', 'reviewer', 'dept_head'].includes(user?.role || '');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── API Calls ────────────────────────────────────────────────────────────────

  const loadEvents = async () => {
    try {
      const res = await api.get('/training-calendar');
      setEvents(res.data);
      const planRes = await api.get('/training-calendar/annual-plans');
      setAnnualPlans(planRes.data);
    } catch { /* silent */ }
  };

  const loadMasters = async () => {
    try {
      const res = await api.get('/settings/departments');
      if (res.data && Array.isArray(res.data)) {
        setDepartments(res.data);
      }
      const adminRes = await api.get('/settings/competency_admins');
      if (adminRes.data && Array.isArray(adminRes.data)) {
        setCompetencyAdmins(adminRes.data);
      }
    } catch { /* silent */ }
  };

  const loadAllAttendance = async () => {
    try {
      // Fetch attendance for all trainings combined
      const res = await api.get('/training-calendar');
      const evts: TrainingEvent[] = res.data;
      const all: AttendanceRecord[] = [];
      for (const ev of evts) {
        const aRes = await api.get(`/training-calendar/${ev.id}/attendance`);
        all.push(...aRes.data.map((r: AttendanceRecord) => ({ ...r, trainingName: ev.trainingName, eventId: ev.id })));
      }
      setAllAttendance(all);
    } catch { /* silent */ }
  };

  const loadAnalytics = async (id: string, start?: string, end?: string) => {
    setLoadingAnalytics(true);
    try {
      if (!id) { setAnalyticsData(null); return; }
      
      let res;
      if (id === 'all') {
        const queryParams = new URLSearchParams();
        if (start) queryParams.append('startDate', start);
        if (end) queryParams.append('endDate', end);
        if (!isGodMode && user?.department) queryParams.append('department', user.department);
        const qs = queryParams.toString();
        res = await api.get(`/training-calendar/analytics/aggregate${qs ? `?${qs}` : ''}`);
      } else {
        res = await api.get(`/training-calendar/${id}/analytics`);
      }
      setAnalyticsData(res.data);
    } catch {
      showToast('Failed to load analytics', 'error');
      setAnalyticsData(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // ── Create Training ──────────────────────────────────────────────────────────

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/training-calendar', createForm);
      setIsCreateOpen(false);
      setCreateForm({ trainingName: '', trainingDate: '', location: '', startTime: '', endTime: '', department: 'All' });
      showToast('Training created successfully!');
      await loadEvents();
      // Auto-show QR
      setQrModal({ event: res.data, qrDataUrl: res.data.qrCodeDataUrl, qrUrl: res.data.qrUrl });
    } catch {
      showToast('Failed to create training', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Dashboard Computations ──────────────────────────────────────────────────
  const dashboardMetrics = (() => {
    if (subTab !== 'dashboard') return null;
    
    // Filter events by date
    const filteredEvents = events.filter(e => {
      if (!dashStartDate && !dashEndDate) return true;
      const ed = new Date(e.trainingDate);
      if (dashStartDate && ed < new Date(dashStartDate)) return false;
      if (dashEndDate && ed > new Date(dashEndDate)) return false;
      return true;
    });

    const eventMap = new Map<string, TrainingEvent>(filteredEvents.map(e => [e.id, e]));
    
    // Only count attendances linked to our filtered events
    const scopedAttendance = allAttendance.filter(a => eventMap.has((a as any).eventId));
    // Calculate Hours and Participants by Dept
    const deptStats: Record<string, { hours: number, participants: number }> = {};

    scopedAttendance.forEach(a => {
      const dept = a.department || 'Unknown';
      if (!deptStats[dept]) deptStats[dept] = { hours: 0, participants: 0 };
      
      deptStats[dept].participants++;

      // Calculate hours per individual
      const ev = eventMap.get((a as any).eventId);
      if (ev && ev.startTime && ev.endTime) {
        const [sH, sM] = ev.startTime.split(':').map(Number);
        const [eH, eM] = ev.endTime.split(':').map(Number);
        let diff = (eH + eM/60) - (sH + sM/60);
        if (diff < 0) diff += 24; // Handle over-midnight if that happens
        deptStats[dept].hours += diff;
      }
    });

    const sortedDepts = Object.entries(deptStats).sort((a,b) => b[1].participants - a[1].participants);
    
    // Final filtering for restricted users
    const finalChartData = isGodMode 
      ? sortedDepts.map(([name, stats]) => ({ name, hours: Number(stats.hours.toFixed(1)), participants: stats.participants }))
      : sortedDepts.filter(([name]) => name === user?.department).map(([name, stats]) => ({ name, hours: Number(stats.hours.toFixed(1)), participants: stats.participants }));

    const topDept = finalChartData.length > 0 ? finalChartData[0].name : 'None';

    return { totalTrainings: filteredEvents.length, totalAttendance: scopedAttendance.length, topDept, chartData: finalChartData };
  })();

  // ── View QR ──────────────────────────────────────────────────────────────────

  const viewQr = async (event: TrainingEvent) => {
    try {
      const res = await api.get(`/training-calendar/${event.id}/qr`);
      setQrModal({ event, qrDataUrl: res.data.qrCodeDataUrl, qrUrl: res.data.qrUrl });
    } catch { showToast('Failed to load QR code', 'error'); }
  };

  // ── View Attendance ───────────────────────────────────────────────────────────

  const viewAttendance = async (event: TrainingEvent) => {
    try {
      const res = await api.get(`/training-calendar/${event.id}/attendance`);
      setAttendanceModal({ event, records: res.data });
    } catch { showToast('Failed to load attendance', 'error'); }
  };

  // ── Download QR ───────────────────────────────────────────────────────────────

  const downloadQr = () => {
    if (!qrModal) return;
    const link = document.createElement('a');
    link.href = qrModal.qrDataUrl;
    link.download = `QR-${qrModal.event.trainingName.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  // ── Delete Training ────────────────────────────────────────────────────────────

  const deleteTraining = async (id: string) => {
    if (!confirm('Delete this training? All attendance records will be removed.')) return;
    try {
      await api.delete(`/training-calendar/${id}`);
      showToast('Training deleted');
      loadEvents();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/training-calendar/annual-plans', planForm);
      setLoading(false);
      setIsPlanOpen(false);
      setPlanForm({ topic: '', month: currentMonth, year: currentYear, department: 'All' });
      loadEvents();
      showToast('Training Plan added to matrix');
    } catch (err: any) {
      setLoading(false);
      showToast('Failed to add training plan', 'error');
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Remove this planned training topic from the matrix?')) return;
    try {
      await api.delete(`/training-calendar/annual-plans/${id}`);
      loadEvents();
      showToast('Training plan removed');
    } catch (err: any) {
      showToast('Failed to remove plan', 'error');
    }
  };

  // ── Manual Sync ────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/training-calendar/sync');
      showToast('Sync completed! Attendance records updated.');
      if (subTab === 'attendance') loadAllAttendance();
    } catch { showToast('Sync failed', 'error'); }
    finally { setSyncing(false); }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    if (allAttendance.length === 0) {
      showToast('No records to export', 'error');
      return;
    }

    const headers = [
      'Employee ID', 'Employee Name', 'Department', 'Training', 'Date/Time', 'IP Address',
      'Target Objective Aware?', 'Presentation Rating', 'Material Rating',
      'Facilitator Rating', 'Overall Rating', 'Would Recommend?',
      'Ideas', 'Suggestions'
    ];

    const rows = allAttendance.map(r => {
      const fb = r.feedback || {};
      return [
        r.employeeId,
        `"${r.employeeName.replace(/"/g, '""')}"`,
        `"${(r.department || 'N/A').replace(/"/g, '""')}"`,
        `"${((r as any).trainingName || 'Unknown').replace(/"/g, '""')}"`,
        `"${new Date(r.markedAt).toLocaleString('en-IN')}"`,
        r.ipAddress || 'unknown',
        fb.q1_aware_objective !== undefined && fb.q1_aware_objective !== null ? (fb.q1_aware_objective ? 'Yes' : 'No') : 'N/A',
        fb.q2_presentation || 'N/A',
        fb.q3_material || 'N/A',
        fb.q4_facilitator || 'N/A',
        fb.q5_overall || 'N/A',
        fb.q6_recommend !== undefined && fb.q6_recommend !== null ? (fb.q6_recommend ? 'Yes' : 'No') : 'N/A',
        `"${(fb.q7_ideas || '').replace(/"/g, '""')}"`,
        `"${(fb.q8_suggestions || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl transition-all
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-1">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {(['calendar', 'dashboard', 'attendance', 'analytics'] as const).map(tab => (
            <button key={tab} onClick={() => { 
                setSubTab(tab); 
                if (tab === 'attendance' || tab === 'dashboard') loadAllAttendance();
                if (tab === 'analytics' && !analyticsData) loadAnalytics(selectedTrainingId, analyticsStartDate, analyticsEndDate);
              }}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm capitalize transition-colors whitespace-nowrap
                ${subTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'calendar' ? '📅 Calendar' : tab === 'dashboard' ? '📊 Dashboard' : tab === 'attendance' ? '📋 Attendance' : '📈 Analytics'}
            </button>
          ))}
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>

      {/* ── TRAINING CALENDAR MATRIX TAB ───────────────────────────────────────  */}
      {subTab === 'calendar' && (() => {
        const fyMonths = Array.from({ length: 12 }, (_, i) => {
          const mIdx = (i + 3) % 12;
          const yr = i < 9 ? matrixYear : matrixYear + 1;
          const d = new Date(yr, mIdx, 1);
          return { label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), month: mIdx, year: yr };
        });

        const fyEvents = events.filter(e => {
          const d = new Date(e.trainingDate);
          const isCorrectFY = d.getMonth() >= 3 ? d.getFullYear() === matrixYear : d.getFullYear() === matrixYear + 1;
          if (!isGodMode && e.department !== user?.department && e.department !== 'All') return false;
          return isCorrectFY;
        });

        const fyPlans = annualPlans.filter(p => {
          const isCorrectFY = p.month >= 3 ? p.year === matrixYear : p.year === matrixYear + 1;
          if (!isGodMode && p.department !== user?.department && p.department !== 'All') return false;
          return isCorrectFY;
        });

        const topicEarliestDate = new Map<string, number>();
        
        let minFY = defaultFY;
        let maxFY = defaultFY + 4; // Always allow planning +4 years ahead

        events.forEach(e => {
          if (!e.trainingDate) return;
          const d = new Date(e.trainingDate);
          const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
          if (y < minFY) minFY = y;
          if (y > maxFY) maxFY = y;
        });

        annualPlans.forEach(p => {
          const y = p.month >= 3 ? p.year : p.year - 1;
          if (y < minFY) minFY = y;
          if (y > maxFY) maxFY = y;
        });

        const availableFYs = [];
        for (let y = minFY; y <= maxFY; y++) {
          availableFYs.push(y);
        }

        fyEvents.forEach(e => {
          const t = new Date(e.trainingDate).getTime();
          if (!topicEarliestDate.has(e.trainingName) || t < topicEarliestDate.get(e.trainingName)!) {
            topicEarliestDate.set(e.trainingName, t);
          }
        });
        fyPlans.forEach(p => {
          const t = new Date(p.year, p.month, 1).getTime();
          if (!topicEarliestDate.has(p.topic) || t < topicEarliestDate.get(p.topic)!) {
            topicEarliestDate.set(p.topic, t);
          }
        });
        const uniqueTopics = Array.from(topicEarliestDate.keys()).sort((a, b) => topicEarliestDate.get(a)! - topicEarliestDate.get(b)!);

        return (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Annual Training Calendar</h2>
                <p className="text-sm text-slate-500 mt-0.5">Plan, schedule, and track training sessions across the financial year.</p>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={matrixYear}
                  onChange={e => setMatrixYear(Number(e.target.value))}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-medium focus:border-blue-500 focus:outline-none"
                >
                  {availableFYs.map((yr) => (
                    <option key={yr} value={yr}>FY {yr}-{(yr+1).toString().slice(2)}</option>
                  ))}
                </select>
                {(isGodMode || isManager) && (
                  <>
                    <button onClick={() => setIsPlanOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap">
                      <Plus size={16} /> Plan
                    </button>
                    <button onClick={() => setIsCreateOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
                      <Calendar size={16} /> Schedule
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 min-w-[250px] sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      Topic
                    </th>
                    {fyMonths.map(m => (
                      <th key={m.label} className="text-center px-2 py-3 font-semibold text-slate-600 min-w-[90px]">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uniqueTopics.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-16 text-center text-slate-500">
                        <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        No trainings scheduled for FY {matrixYear}-{(matrixYear+1).toString().slice(2)}.
                      </td>
                    </tr>
                  ) : (
                    uniqueTopics.map(topic => (
                      <tr key={topic} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {topic}
                        </td>
                        {fyMonths.map(m => {
                          const cellEvents = fyEvents.filter(e => {
                            const d = new Date(e.trainingDate);
                            return e.trainingName === topic && d.getMonth() === m.month && d.getFullYear() === m.year;
                          });
                          
                          const cellPlans = fyPlans.filter(p => p.topic === topic && p.month === m.month && p.year === m.year);

                          return (
                            <td key={`${topic}-${m.label}`} className={`px-1 py-1 text-center align-middle border-l border-slate-100/50 ${(cellPlans.length > 0 && cellEvents.length === 0) ? 'bg-blue-50/30' : ''}`}>
                              {cellEvents.length > 0 ? (
                                <div className="flex flex-col gap-1 items-center justify-center py-1">
                                  {cellEvents.map(ev => (
                                    <div key={ev.id} className="flex items-center justify-center gap-0.5 bg-white border border-slate-200 rounded px-1 min-h-[28px] shadow-sm w-max mx-auto hover:border-blue-300 hover:shadow-md transition-all" title={`${formatDate(ev.trainingDate)} - ${ev.location || 'No Location'} (${ev.department || 'All'})`}>
                                      {new Date(ev.trainingDate) >= new Date(new Date().setHours(0,0,0,0)) && (
                                        <button onClick={() => viewQr(ev)} className="p-1 hover:text-blue-600 text-slate-400 transition-colors" title="QR Code">
                                          <QrCode size={13} />
                                        </button>
                                      )}
                                      <button onClick={() => viewAttendance(ev)} className="p-1 hover:text-emerald-600 text-slate-400 transition-colors" title="Attendance">
                                        <Users size={13} />
                                      </button>
                                      <button onClick={() => deleteTraining(ev.id)} className="p-1 hover:text-red-500 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                                        <X size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : cellPlans.length > 0 ? (
                                <div className="flex flex-col gap-1 items-center justify-center py-1">
                                  {cellPlans.map(plan => (
                                    <div key={plan.id} className="flex items-center justify-center gap-1 bg-blue-50/80 border border-blue-200 text-blue-500 rounded px-1.5 py-1 min-h-[28px] shadow-sm w-max mx-auto transition-all group/plan" title={`Planned for this month (${plan.department || 'All'})`}>
                                      <Target size={14} />
                                      <span className="text-[10px] font-medium uppercase tracking-wider hidden group-hover/plan:inline-block">Plan</span>
                                      <button onClick={() => deletePlan(plan.id)} className="p-0.5 hover:text-red-500 text-blue-300 opacity-0 group-hover/plan:opacity-100 transition-opacity ml-1" title="Remove Plan">
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Nomenclature Legend */}
            <div className="flex flex-wrap items-center gap-6 mt-4 px-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Nomenclature:</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center gap-1 bg-blue-50 border border-blue-200 text-blue-500 rounded px-1.5 py-0.5 shadow-sm">
                  <Target size={14} />
                </div>
                <span>Planned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-sm text-slate-400">
                  <QrCode size={13} />
                  <Users size={13} />
                </div>
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-sm text-slate-400">
                  <Users size={13} />
                </div>
                <span>Completed</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── DASHBOARD TAB ───────────────────────────────────────────────────── */}
      {subTab === 'dashboard' && dashboardMetrics && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Training Dashboard</h2>
              <p className="text-sm text-slate-500 mt-0.5">High-level KPIs and department-wise training distribution.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="date"
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm focus:border-blue-500 focus:outline-none"
                value={dashStartDate}
                onChange={e => setDashStartDate(e.target.value)}
                title="From Date"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input 
                type="date"
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm focus:border-blue-500 focus:outline-none"
                value={dashEndDate}
                onChange={e => setDashEndDate(e.target.value)}
                title="To Date"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Trainings</p>
              <h3 className="text-3xl font-bold text-slate-800">{dashboardMetrics.totalTrainings}</h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Participants</p>
              <h3 className="text-3xl font-bold text-emerald-600">{dashboardMetrics.totalAttendance}</h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Top Department</p>
              <h3 className="text-xl font-bold text-blue-600 leading-tight mt-1 truncate" title={dashboardMetrics.topDept}>{dashboardMetrics.topDept}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Department-wise Training Hours</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardMetrics.chartData} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="hours" name="Total Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Department-wise Participants</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardMetrics.chartData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={5}
                      dataKey="participants"
                      nameKey="name"
                      label={({ name, percent = 0 }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {dashboardMetrics.chartData.map((_item: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'][index % 8]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ─────────────────────────────────────────────────────  */}
      {subTab === 'attendance' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Attendance Records</h2>
              <p className="text-sm text-slate-500 mt-0.5">Records synced from cloud at midnight. Use "Sync Now" to pull latest.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={exportToCSV} 
                disabled={allAttendance.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>
          {allAttendance.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Wifi className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-medium text-slate-700">No synced attendance yet</h3>
              <p className="text-sm text-slate-500 mt-1">Click "Sync Now" to pull attendance from the cloud database.</p>
              <button onClick={handleSync}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <RefreshCw size={15} /> Sync Now
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Employee ID', 'Employee Name', 'Training', 'Date/Time', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAttendance
                    .filter(r => isGodMode || r.department === user?.department)
                    .map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.employeeId}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.employeeName}</td>
                      <td className="px-4 py-3 text-slate-600">{(r as any).trainingName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.markedAt).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle size={13} /> Present
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ──────────────────────────────────────────────────────── */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-2">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Training Analytics Dashboard</h2>
              <p className="text-sm text-slate-500 mt-0.5">Deep insights into training effectiveness based on participant feedback.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input 
                  type="date"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto"
                  value={analyticsStartDate}
                  onChange={e => {
                    setAnalyticsStartDate(e.target.value);
                    loadAnalytics(selectedTrainingId, e.target.value, analyticsEndDate);
                  }}
                  title="From Date"
                />
                <span className="text-slate-400 text-sm">to</span>
                <input 
                  type="date"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto"
                  value={analyticsEndDate}
                  onChange={e => {
                    setAnalyticsEndDate(e.target.value);
                    loadAnalytics(selectedTrainingId, analyticsStartDate, e.target.value);
                  }}
                  title="To Date"
                />
              </div>

              <select
                className="w-full sm:w-auto min-w-[240px] px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={selectedTrainingId}
                onChange={e => {
                  setSelectedTrainingId(e.target.value);
                  loadAnalytics(e.target.value, analyticsStartDate, analyticsEndDate);
                }}
              >
                <option value="all">All Trainings</option>
                {events
                  .filter(e => isGodMode || e.department === user?.department || e.department === 'All')
                  .filter(e => e.isActive).length > 0 && (
                  <optgroup label="Active Trainings">
                    {events
                      .filter(e => isGodMode || e.department === user?.department || e.department === 'All')
                      .filter(e => e.isActive).map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.trainingName} ({formatDate(ev.trainingDate)})</option>
                    ))}
                  </optgroup>
                )}
                {events
                  .filter(e => isGodMode || e.department === user?.department || e.department === 'All')
                  .filter(e => !e.isActive).length > 0 && (
                  <optgroup label="Past Trainings">
                    {events
                      .filter(e => isGodMode || e.department === user?.department || e.department === 'All')
                      .filter(e => !e.isActive).map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.trainingName} ({formatDate(ev.trainingDate)})</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {!selectedTrainingId ? (
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <BarChart3 className="mx-auto h-12 w-12 text-blue-300 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-slate-700">Select a training to view analytics</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Choose a training session from the dropdown above to analyze participant feedback, sentiment, and scores.</p>
            </div>
          ) : loadingAnalytics ? (
            <div className="text-center py-20 bg-slate-50 border border-slate-200 rounded-xl">
              <RefreshCw className="mx-auto h-8 w-8 text-blue-500 mb-4 animate-spin" />
              <p className="text-sm font-medium text-slate-600">Crunching data...</p>
            </div>
          ) : !analyticsData || !analyticsData.hasData ? (
             <div className="text-center py-20 bg-slate-50 border border-slate-200 rounded-xl">
               <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
               <h3 className="text-lg font-medium text-slate-700">No Feedback Yet</h3>
               <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                 This session has {analyticsData?.totalAttendees || 0} attendees logged, but no feedback forms have been submitted yet.
               </p>
             </div>
          ) : (
            <div className="space-y-6">
              {/* Primary Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10"><Star size={100} /></div>
                  <p className="text-blue-100 text-sm font-medium mb-1 relative z-10">Overall Rating</p>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="text-4xl font-bold tracking-tight">{analyticsData.averages.overall}</span>
                    <span className="text-blue-200 mb-1 text-lg">/ 5.0</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium mb-1">Total Attendees</p>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-slate-800">{analyticsData.totalAttendees}</span>
                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><Users size={20} /></div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium mb-1">Feedback Submitted</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-slate-800">{analyticsData.totalFeedback}</span>
                      <span className="text-slate-400 font-medium mb-1">/ {analyticsData.totalAttendees}</span>
                    </div>
                    <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle size={20} /></div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(analyticsData.totalFeedback / (analyticsData.totalAttendees || 1)) * 100}%` }}></div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium mb-1">Would Recommend</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-slate-800">
                        {Math.round((analyticsData.counts.recommend.yes / analyticsData.totalFeedback) * 100) || 0}%
                      </span>
                      <span className="text-slate-400 text-xs mb-1 font-medium ml-1 block pb-1">Yes</span>
                    </div>
                    <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600"><ThumbsUp size={20} /></div>
                  </div>
                  <div className="w-full flex h-1.5 mt-3 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-1.5" style={{ width: `${(analyticsData.counts.recommend.yes / analyticsData.totalFeedback) * 100}%` }}></div>
                    <div className="bg-red-400 h-1.5" style={{ width: `${(analyticsData.counts.recommend.no / analyticsData.totalFeedback) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Breakdown (Progress Bars) */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-600" /> Category Breakdown
                  </h3>
                  
                  <div className="space-y-5">
                    {[
                      { label: "Presentation Quality", val: analyticsData.averages.presentation, color: "bg-blue-500" },
                      { label: "Course Material", val: analyticsData.averages.material, color: "bg-indigo-500" },
                      { label: "Facilitator Engagement", val: analyticsData.averages.facilitator, color: "bg-purple-500" }
                    ].map(cat => (
                      <div key={cat.label}>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                          <span className="text-sm font-bold text-slate-900">{cat.val} <span className="text-slate-400 text-xs font-normal">/ 5.0</span></span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${cat.color}`} style={{ width: `${(Number(cat.val) / 5) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                     <div>
                       <span className="text-sm font-medium text-slate-700 block mb-1">Clear on Objective?</span>
                       <div className="flex gap-2 text-xs">
                         <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-semibold">{analyticsData.counts.aware.yes} Yes</span>
                         <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-md font-semibold">{analyticsData.counts.aware.no} No</span>
                       </div>
                     </div>
                  </div>
                </div>

                {/* Ideas & Suggestions Feed */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col max-h-[400px]">
                  <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2 shrink-0">
                    <MessageSquare size={18} className="text-blue-600" /> Attendee Voices
                  </h3>
                  <div className="overflow-y-auto flex-1 space-y-4 pr-2">
                    {analyticsData.ideas.length === 0 && analyticsData.suggestions.length === 0 ? (
                      <p className="text-sm text-slate-500 italic py-8 text-center bg-slate-50 rounded-lg">No written feedback provided.</p>
                    ) : (
                      <>
                        {analyticsData.ideas.map((item: any, i: number) => (
                          <div key={`idea-${i}`} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <div className="flex gap-2 items-start">
                              <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{item.text}</p>
                                <p className="text-xs text-slate-400 font-medium mt-1.5 block">— {item.name}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {analyticsData.suggestions.map((item: any, i: number) => (
                          <div key={`sug-${i}`} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <div className="flex gap-2 items-start">
                              <MessageSquare size={16} className="text-blue-500 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{item.text}</p>
                                <p className="text-xs text-slate-400 font-medium mt-1.5 block">— {item.name}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE TRAINING MODAL ──────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Create Training Event</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTraining} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Training Name *</label>
                <input type="text" required placeholder="e.g. ISO 9001 Awareness Training"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  value={createForm.trainingName}
                  onChange={e => setCreateForm({ ...createForm, trainingName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
                  <input type="date" required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                    value={createForm.trainingDate}
                    onChange={e => setCreateForm({ ...createForm, trainingDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
                  <input type="text" placeholder="e.g. Conference Room A"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                    value={createForm.location}
                    onChange={e => setCreateForm({ ...createForm, location: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Time</label>
                  <input type="time"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                    value={createForm.startTime}
                    onChange={e => setCreateForm({ ...createForm, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End Time</label>
                  <input type="time"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                    value={createForm.endTime}
                    onChange={e => setCreateForm({ ...createForm, endTime: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Target Department</label>
                <select
                  disabled={!isGodMode}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  value={createForm.department}
                  onChange={e => setCreateForm({ ...createForm, department: e.target.value })}
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Creating…' : 'Create & Generate QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE PLAN MODAL ─────────────────────────────────────────────────── */}
      {isPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Add Training Plan</h3>
              <button onClick={() => setIsPlanOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Training Topic</label>
                <input type="text" required
                  placeholder="e.g. Kappa Study"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  value={planForm.topic}
                  onChange={e => setPlanForm({ ...planForm, topic: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Target Month</label>
                  <select required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:outline-none"
                    value={planForm.month}
                    onChange={e => setPlanForm({ ...planForm, month: Number(e.target.value) })}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString('en', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Target Year</label>
                  <input type="number" required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                    value={planForm.year}
                    onChange={e => setPlanForm({ ...planForm, year: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Target Department</label>
                <select
                  disabled={!isGodMode}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  value={planForm.department}
                  onChange={e => setPlanForm({ ...planForm, department: e.target.value })}
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsPlanOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Adding…' : 'Add to Matrix'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR CODE MODAL ─────────────────────────────────────────────────────── */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">QR Code</h3>
              <button onClick={() => setQrModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 text-center">
              <img ref={qrImageRef} src={qrModal.qrDataUrl} alt="QR Code"
                className="mx-auto w-52 h-52 rounded-xl border border-slate-100 shadow-sm" />
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-left">
                <p className="text-sm font-semibold text-slate-800">{qrModal.event.trainingName}</p>
                <p className="text-xs text-slate-500 mt-1">{formatDate(qrModal.event.trainingDate)}</p>
                {qrModal.event.location && <p className="text-xs text-slate-500">📍 {qrModal.event.location}</p>}
                {qrModal.event.startTime && (
                  <p className="text-xs text-slate-500">🕐 {qrModal.event.startTime} – {qrModal.event.endTime}</p>
                )}
              </div>
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-mono break-all">{qrModal.qrUrl}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={downloadQr}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                  <Download size={16} /> Download PNG
                </button>
                <button onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
                  🖨 Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE MODAL ───────────────────────────────────────────────────── */}
      {attendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900">{attendanceModal.event.trainingName}</h3>
                <p className="text-xs text-slate-500">{attendanceModal.records.length} attendees</p>
              </div>
              <button onClick={() => setAttendanceModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {attendanceModal.records.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm">No attendance records yet.</p>
                  <p className="text-xs mt-1 text-slate-400">Records will appear after employees scan the QR code.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attendanceModal.records.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{r.employeeName}</p>
                          <p className="text-xs text-slate-500 font-mono">{r.employeeId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{new Date(r.markedAt).toLocaleTimeString('en-IN')}</p>
                        <span className="text-xs text-emerald-600 font-medium">✓ Present</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
