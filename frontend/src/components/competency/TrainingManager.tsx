import { useState, useEffect, useRef } from 'react';
import { CompetencyAPI } from '../../lib/competency-api';
import { CompetencyTable } from './CompetencyTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, X, QrCode, Users, RefreshCw, Download, Calendar, MapPin, Clock, CheckCircle, Wifi } from 'lucide-react';
import api from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrainingProgram {
  id: string; name: string; provider: string; duration: string;
  targetCompetency?: { name: string; id: string };
}

interface TrainingEvent {
  id: string;
  trainingName: string;
  trainingDate: string;
  location: string;
  startTime: string;
  endTime: string;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  markedAt: string;
  ipAddress: string;
  syncedFromCloud: boolean;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TrainingManager() {
  const [subTab, setSubTab] = useState<'calendar' | 'programs' | 'attendance'>('calendar');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [qrModal, setQrModal] = useState<{ event: TrainingEvent; qrDataUrl: string; qrUrl: string } | null>(null);
  const [attendanceModal, setAttendanceModal] = useState<{ event: TrainingEvent; records: AttendanceRecord[] } | null>(null);

  const [createForm, setCreateForm] = useState({
    trainingName: '', trainingDate: '', location: '', startTime: '', endTime: ''
  });
  const [programForm, setProgramForm] = useState({ name: '', provider: '', duration: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const qrImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => { loadEvents(); loadPrograms(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── API Calls ────────────────────────────────────────────────────────────────

  const loadEvents = async () => {
    try {
      const res = await api.get('/training-calendar');
      setEvents(res.data);
    } catch { /* silent */ }
  };

  const loadPrograms = async () => {
    try {
      const res = await CompetencyAPI.getTrainingPrograms();
      setPrograms(res.data);
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
        all.push(...aRes.data.map((r: AttendanceRecord) => ({ ...r, trainingName: ev.trainingName })));
      }
      setAllAttendance(all);
    } catch { /* silent */ }
  };

  // ── Create Training ──────────────────────────────────────────────────────────

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/training-calendar', createForm);
      setIsCreateOpen(false);
      setCreateForm({ trainingName: '', trainingDate: '', location: '', startTime: '', endTime: '' });
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

  // ── Create Program ──────────────────────────────────────────────────────────

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await CompetencyAPI.createTrainingProgram(programForm);
      setIsProgramModalOpen(false);
      setProgramForm({ name: '', provider: '', duration: '', description: '' });
      showToast('Program created');
      loadPrograms();
    } catch { showToast('Failed to create program', 'error'); }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  // ── Program columns ───────────────────────────────────────────────────────────

  const columnsPrograms: ColumnDef<TrainingProgram>[] = [
    { accessorKey: 'name', header: 'Program Name' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'duration', header: 'Duration' },
    { accessorKey: 'targetCompetency.name', header: 'Target Competency' },
  ];

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
        <div className="flex gap-1">
          {(['calendar', 'programs', 'attendance'] as const).map(tab => (
            <button key={tab} onClick={() => { setSubTab(tab); if (tab === 'attendance') loadAllAttendance(); }}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm capitalize transition-colors
                ${subTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'calendar' ? '📅 Calendar' : tab === 'programs' ? '📚 Programs' : '📊 Attendance'}
            </button>
          ))}
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>

      {/* ── TRAINING CALENDAR TAB ──────────────────────────────────────────────  */}
      {subTab === 'calendar' && (
        <div>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Training Calendar</h2>
              <p className="text-sm text-slate-500 mt-0.5">Create training sessions and share QR codes for attendance.</p>
            </div>
            <button onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={18} /> Create Training
            </button>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-medium text-slate-700">No training events yet</h3>
              <p className="text-sm text-slate-500 mt-1">Create your first training to generate a QR code for attendance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => (
                <div key={ev.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 truncate">{ev.trainingName}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ev.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {ev.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Calendar size={13} />{formatDate(ev.trainingDate)}</span>
                        {ev.location && <span className="flex items-center gap-1"><MapPin size={13} />{ev.location}</span>}
                        {ev.startTime && <span className="flex items-center gap-1"><Clock size={13} />{ev.startTime} – {ev.endTime}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button onClick={() => viewQr(ev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                        <QrCode size={14} /> QR Code
                      </button>
                      <button onClick={() => viewAttendance(ev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                        <Users size={14} /> Attendance
                      </button>
                      <button onClick={() => deleteTraining(ev.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROGRAMS TAB ──────────────────────────────────────────────────────── */}
      {subTab === 'programs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Training Programs Library</h2>
            <button onClick={() => setIsProgramModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={18} /> New Program
            </button>
          </div>
          <CompetencyTable columns={columnsPrograms} data={programs} />
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
                  {allAttendance.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.employeeId}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.employeeName}</td>
                      <td className="px-4 py-3 text-slate-600">{(r as unknown as { trainingName: string }).trainingName}</td>
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

      {/* ── PROGRAM MODAL ─────────────────────────────────────────────────────── */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Create Training Program</h3>
              <button onClick={() => setIsProgramModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateProgram} className="space-y-4">
              {(['name', 'provider', 'duration'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{field}</label>
                  <input type="text" required={field === 'name'}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                    value={programForm[field]}
                    onChange={e => setProgramForm({ ...programForm, [field]: e.target.value })} />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsProgramModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
