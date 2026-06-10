import { useState, useEffect } from 'react';
import { 
  GitBranch, 
  ExternalLink, 
  Settings, 
  Layers, 
  Shield, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Search, 
  Save, 
  Trash2, 
  UserCheck, 
  Building2, 
  Briefcase,
  AlertCircle,
  FileText
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  role: string;
}

export default function MocPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'log_register' | 'settings'>('overview');
  const [users, setUsers] = useState<UserData[]>([]);
  const [mocs, setMocs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [logsSearchTerm, setLogsSearchTerm] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const currentUser = useAuthStore(state => state.user);

  const [authSettings, setAuthSettings] = useState<{
    plantHead: string[];
    ceo: string[];
    ehs: string[];
    qa: string[];
  }>({
    plantHead: [],
    ceo: [],
    ehs: [],
    qa: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch DMS users
      const usersRes = await api.get('/users');
      setUsers(usersRes.data || []);

      // Fetch MOC records (since shared backend)
      const mocsRes = await api.get('/moc');
      setMocs(mocsRes.data || []);

      // Fetch audit logs
      const logsRes = await api.get('/moc/logs');
      setLogs(logsRes.data || []);

      // Fetch custom settings
      const settingsRes = await api.get('/settings/moc_approval_settings');
      if (settingsRes.data) {
        setAuthSettings({
          plantHead: settingsRes.data.plantHead || [],
          ceo: settingsRes.data.ceo || [],
          ehs: settingsRes.data.ehs || [],
          qa: settingsRes.data.qa || []
        });
      }
    } catch (err) {
      console.error('Failed to load MOC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeStyle = (action: string) => {
    switch (action?.toLowerCase()) {
      case 'create':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'submit':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'approve':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'reject':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'update':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'delete':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredLogs = logs.filter(log => {
    const query = logsSearchTerm.toLowerCase();
    const action = (log.action || '').toLowerCase();
    const details = (log.details || '').toLowerCase();
    const mocNo = log.moc?.mocNo?.toLowerCase() || '';
    
    let userName = '';
    let userEmail = '';
    if (log.user) {
      userName = `${log.user.firstName || ''} ${log.user.lastName || ''}`.toLowerCase();
      userEmail = (log.user.email || '').toLowerCase();
    }
    
    return action.includes(query) || 
           details.includes(query) || 
           mocNo.includes(query) || 
           userName.includes(query) || 
           userEmail.includes(query);
  });

  const handleDeleteMoc = async (id: string, mocNo: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete MOC ${mocNo}?`)) {
      return;
    }
    try {
      setLoading(true);
      await api.delete(`/moc/${id}`);
      showToast(`MOC ${mocNo} deleted successfully.`);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete MOC:', err);
      showToast('Failed to delete MOC', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.post('/settings/moc_approval_settings', { value: authSettings });
      showToast('MOC approval settings saved successfully!');
    } catch (err) {
      console.error('Failed to save MOC settings:', err);
      showToast('Failed to save MOC settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openMocPortal = () => {
    window.open('http://localhost:5173', '_blank');
  };

  // Stats derived from live data
  const totalCount = mocs.length;
  const pendingCount = mocs.filter(m => m.status && m.status.toLowerCase().includes('pending')).length;
  const approvedCount = mocs.filter(m => m.status === 'Approved' || m.status === 'Finalized' || m.status === 'Closed').length;
  const closedCount = mocs.filter(m => m.status === 'Finalized' || m.status === 'Closed').length;

  // Filtered MOCs list search
  const filteredMocs = mocs.filter(moc => {
    const query = searchTerm.toLowerCase();
    const mocNo = (moc.mocNo || '').toLowerCase();
    const process = (moc.productProcess || '').toLowerCase();
    const status = (moc.status || '').toLowerCase();
    
    let requisitioner = moc.requisitionByName || '';
    if (!requisitioner && moc.requisitionBy) {
      if (typeof moc.requisitionBy === 'object') {
        requisitioner = `${moc.requisitionBy.firstName || ''} ${moc.requisitionBy.lastName || ''}`.trim() || moc.requisitionBy.name || '';
      } else {
        requisitioner = String(moc.requisitionBy);
      }
    }
    
    return mocNo.includes(query) || 
           process.includes(query) || 
           requisitioner.toLowerCase().includes(query) || 
           status.includes(query);
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Pending HOD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending Plant Head':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending CEO':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Pending EHS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending QA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Finalized':
      case 'Closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-150 text-slate-700 border-slate-250';
    }
  };

  const RoleConfigCard = ({ roleKey, label, icon: Icon, color, bg }: {
    roleKey: 'plantHead' | 'ceo' | 'ehs' | 'qa';
    label: string;
    icon: any;
    color: string;
    bg: string;
  }) => {
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const selectedEmails = authSettings[roleKey] || [];

    const handleAdd = (email: string) => {
      if (selectedEmails.includes(email)) return;
      setAuthSettings(prev => ({
        ...prev,
        [roleKey]: [...selectedEmails, email]
      }));
      setSearch('');
      setShowDropdown(false);
    };

    const handleRemove = (email: string) => {
      setAuthSettings(prev => ({
        ...prev,
        [roleKey]: selectedEmails.filter(e => e !== email)
      }));
    };

    const filtered = users.filter(u => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const matchesSearch = fullName.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
      const notSelected = !selectedEmails.includes(u.email);
      return matchesSearch && notSelected;
    });

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between min-h-[340px] relative hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
            <div className={`p-2 rounded-xl ${bg} ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm text-left">{label}</h3>
              <p className="text-[10px] text-slate-400 font-medium text-left">Authorized Approver(s)</p>
            </div>
          </div>

          {/* Selected List */}
          <div className="space-y-2 max-h-36 overflow-y-auto mb-4 custom-scrollbar">
            {selectedEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="w-5 h-5 text-slate-300 mb-1" />
                <p className="text-[10px] italic font-semibold">No custom email configured</p>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-normal max-w-[150px]">Falls back to system-wide role matching</p>
              </div>
            ) : (
              selectedEmails.map(email => {
                const u = users.find(u => u.email === email);
                const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : email;
                return (
                  <div key={email} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                    <div className="min-w-0 pr-2 text-left">
                      <p className="font-bold text-slate-700 truncate">{name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(email)}
                      className="text-slate-400 hover:text-red-500 p-1 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Add Input & Floating Dropdown */}
        <div className="relative mt-auto pt-2 border-t border-slate-100">
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left">Search & Add Approver</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type name or email..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {showDropdown && search && (
            <div className="absolute left-0 bottom-full mb-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <p className="p-2 text-center text-xs text-slate-400">No matching users</p>
              ) : (
                filtered.map(u => {
                  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={() => handleAdd(u.email)}
                      className="w-full text-left p-2 hover:bg-blue-50 text-xs transition-colors flex justify-between items-center"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-700 truncate">{name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">{u.department || 'N/A'}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-white text-sm font-semibold shadow-xl transition-all duration-300
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GitBranch className="text-blue-600 w-8 h-8" />
            Management of Change (MOC)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track, approve, and configure sequential operational and structural process changes
          </p>
        </div>
        <button
          onClick={openMocPortal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer group text-sm self-start md:self-auto"
        >
          <span>Launch Standalone MOC Portal</span>
          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 gap-1.5">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'list', label: 'List of MOC', icon: FileText },
          { id: 'log_register', label: 'Log Register', icon: Activity },
          { id: 'settings', label: 'Setting / Approvers', icon: Settings }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                isActive 
                  ? 'border-blue-600 text-blue-600 bg-blue-50/10' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Mockup Stats (Flat Row with Subtle Borders) */}
          <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-200 rounded-xl divide-x divide-y md:divide-y-0 divide-slate-200 bg-white overflow-hidden shadow-sm">
            {[
              { label: 'Total Registered', count: totalCount, icon: FileText, color: 'text-slate-650', bg: 'bg-slate-50' },
              { label: 'Pending Approval', count: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Approved Changes', count: approvedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Finalized / Synced', count: closedCount, icon: GitBranch, color: 'text-blue-600', bg: 'bg-blue-50' }
            ].map((stat, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{stat.label}</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{stat.count}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Sequential Workflow Bar (Horizontal Pipeline) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-left">
            <h2 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4">7-Stage Change Control Process</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
              {[
                { stage: 1, name: 'Creator Raise', desc: 'Draft initiated', icon: UserCheck, color: 'text-slate-605', bg: 'bg-slate-50' },
                { stage: 2, name: 'HOD Review', desc: 'Dept Head sign', icon: UserCheck, color: 'text-amber-650', bg: 'bg-amber-50/50' },
                { stage: 3, name: 'Plant Head', desc: 'Logistics audit', icon: Building2, color: 'text-amber-650', bg: 'bg-amber-50/50' },
                { stage: 4, name: 'CEO Approval', desc: 'Risk sign-off', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50/50' },
                { stage: 5, name: 'EHS Clearance', desc: 'Safety audit', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                { stage: 6, name: 'QA Approval', desc: 'Systems sign', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                { stage: 7, name: 'Finalized', desc: 'Synced & closed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/60' }
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50/40 border border-slate-150 rounded-lg hover:border-blue-300 transition-colors">
                  <div className={`w-7 h-7 rounded-full ${step.bg} ${step.color} flex items-center justify-center font-bold text-[11px] shrink-0 border border-current/10`}>
                    {step.stage}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold text-slate-800 truncate">{step.name}</div>
                    <div className="text-[9px] text-slate-450 truncate leading-none mt-0.5">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Launcher Bar (Sleek Inline Row) */}
          <div className="bg-blue-50/40 border border-blue-150 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900">Standalone Management of Change (MOC) Portal</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                  Launch the dedicated shopfloor interface to raise change requests, submit trial reports, complete safety checklists, and execute digital sign approvals.
                </p>
              </div>
            </div>
            <button
              onClick={openMocPortal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all shrink-0 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Access MOC Portal</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-4 animate-in fade-in duration-200 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800 text-left">Recent Process & Operational Changes</h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by MOC No, Process, Status..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">MOC Number</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Process / Product</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requisitioner</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Raised Date</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Fetching change control list...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">
                      No matching records found in the database.
                    </td>
                  </tr>
                ) : (
                  filteredMocs.map(moc => {
                    let requisitioner = moc.requisitionByName || 'N/A';
                    if (requisitioner === 'N/A' && moc.requisitionBy) {
                      if (typeof moc.requisitionBy === 'object') {
                        requisitioner = `${moc.requisitionBy.firstName || ''} ${moc.requisitionBy.lastName || ''}`.trim() || moc.requisitionBy.name || 'N/A';
                      } else {
                        requisitioner = String(moc.requisitionBy);
                      }
                    }
                    return (
                      <tr 
                        key={moc.id} 
                        onClick={openMocPortal}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group text-xs"
                      >
                        <td className="px-4 py-3 font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{moc.mocNo}</td>
                        <td className="px-4 py-3">
                          {moc.mocMode ? (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${
                              moc.mocMode === 'Trial' 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {moc.mocMode}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{moc.productProcess || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-500 font-medium">{requisitioner}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getStatusStyle(moc.status)}`}>
                            {moc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-semibold">
                          {moc.createdAt ? new Date(moc.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 text-right ml-auto">
                            <button
                              onClick={openMocPortal}
                              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-150 transition-colors cursor-pointer"
                            >
                              <span>Open Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            {currentUser?.role === 'admin' && (
                              <button
                                onClick={() => handleDeleteMoc(moc.id, moc.mocNo)}
                                className="flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                title="Delete MOC"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'log_register' && (
        <div className="space-y-4 animate-in fade-in duration-200 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="text-left">
              <h3 className="text-base font-bold text-slate-800">Change Audit & Activity Register</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Chronological system audit trail of all MOC actions</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search logs by MOC, User, Action..." 
                value={logsSearchTerm}
                onChange={(e) => setLogsSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">MOC No</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Account</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remarks / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Fetching system audit logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic text-xs">
                      No matching log entries found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const mocNo = log.moc?.mocNo || (log.details?.match(/MOC\s([0-9-]{8,})/)?.[1]) || 'N/A';
                    
                    let userName = 'System / Unknown';
                    let userEmail = '';
                    if (log.user) {
                      userName = `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.name || log.user.email || 'User';
                      userEmail = log.user.email;
                    }

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/30 transition-colors text-xs">
                        <td className="px-4 py-2.5 text-slate-400 font-semibold whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString(undefined, { 
                            dateStyle: 'short', 
                            timeStyle: 'short' 
                          })}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                          {mocNo !== 'N/A' ? (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-bold border border-slate-200">
                              {mocNo}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-left">
                          <div className="font-bold text-slate-700 leading-normal">{userName}</div>
                          {userEmail && <div className="text-[10px] text-slate-400 mt-0.5 font-medium leading-none">{userEmail}</div>}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getActionBadgeStyle(log.action)}`}>
                            {log.action?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 font-medium leading-relaxed max-w-sm truncate hover:text-clip hover:whitespace-normal" title={log.details}>
                          {log.details || 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="text-left">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="text-blue-600" size={24} />
                  MOC Multi-Tier Approver Configuration
                </h2>
                <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                  Delegate custom authorized email accounts to specific sequential roles. When configured, only these specified users can approve or sign change control applications. If left empty, system-wide department head or compliance manager roles are applied.
                </p>
              </div>
              <button 
                disabled={saving || loading}
                onClick={handleSaveSettings}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-colors text-sm disabled:opacity-50 cursor-pointer shrink-0"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Saving...' : 'Save Approvers'}
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 font-semibold">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span>Loading configurations...</span>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Plant Head Card */}
                <RoleConfigCard 
                  roleKey="plantHead" 
                  label="1. Plant Head Authority" 
                  icon={Building2} 
                  color="text-amber-600" 
                  bg="bg-amber-50" 
                />

                {/* 2. CEO Card */}
                <RoleConfigCard 
                  roleKey="ceo" 
                  label="2. Chief Executive Officer" 
                  icon={Briefcase} 
                  color="text-purple-600" 
                  bg="bg-purple-50" 
                />

                {/* 3. EHS Representative Card */}
                <RoleConfigCard 
                  roleKey="ehs" 
                  label="3. EHS Lead Officer" 
                  icon={Activity} 
                  color="text-blue-600" 
                  bg="bg-blue-50" 
                />

                {/* 4. QA Head Card */}
                <RoleConfigCard 
                  roleKey="qa" 
                  label="4. Quality Assurance Head" 
                  icon={Shield} 
                  color="text-emerald-600" 
                  bg="bg-emerald-50" 
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
