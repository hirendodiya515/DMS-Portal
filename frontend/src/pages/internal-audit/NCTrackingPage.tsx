import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Search, Filter, CheckCircle2, AlertCircle, Clock, 
  ChevronDown, LayoutDashboard, Database,
  Calendar, User, FileText, CheckSquare, XCircle, Loader2, Eye, Sparkles
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { PreAuditBriefingModal } from '../../components/audit/PreAuditBriefingModal';

interface NC {
  executionId: string;
  id: string;
  title: string;
  docNumber: string;
  observation: string;
  clause: string;
  status: string;
  ncStatement: string;
  requirement: string;
  targetDate: string;
  date: string;
  observedDate?: string;
  executionDate?: string;
  scheduledDate?: string;
  department: string;
  auditors: { id: string; name: string; email?: string }[];
  ncStatus: 'Open' | 'Awaiting Review' | 'Closed';
  auditeeCompletionDate?: string;
  rootCause?: string;
  correctiveAction?: string;
  pointToCheckInNextAudit?: string;
  closedDate?: string;
  closedBy?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const STATUS_COLORS = {
  'Open': '#f43f5e',           // Rose-500
  'Awaiting Review': '#f59e0b', // Amber-500
  'Closed': '#10b981'          // Emerald-500
};

export default function NCTrackingPage() {
  const [ncs, setNcs] = useState<NC[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNC, setSelectedNC] = useState<NC | null>(null);
  const [closing, setClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [briefingState, setBriefingState] = useState<{ isOpen: boolean; department?: string }>({ isOpen: false });

  const [closureData, setClosureData] = useState({
    rootCause: '',
    correctiveAction: '',
    auditeeCompletionDate: '',
    pointToCheckInNextAudit: ''
  });

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchNCs();
  }, []);

  const fetchNCs = async () => {
    try {
      const res = await api.get('/audit-executions/nc-list');
      setNcs(res.data);
    } catch (error) {
      console.error('Failed to fetch NCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const auditPlans = useMemo(() => {
    const plans = new Set<string>();
    ncs.forEach(nc => {
      const monthYear = new Date(nc.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      plans.add(monthYear);
    });
    return ['All', ...Array.from(plans).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())];
  }, [ncs]);

  const filteredNCs = useMemo(() => {
    return ncs.filter(nc => {
      const monthYear = new Date(nc.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const matchesPlan = selectedPlan === 'All' || monthYear === selectedPlan;
      const matchesSearch = 
        nc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nc.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nc.ncStatement.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nc.clause.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPlan && matchesSearch;
    });
  }, [ncs, selectedPlan, searchTerm]);

  // Chart Data
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredNCs.forEach(nc => {
      counts[nc.department] = (counts[nc.department] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredNCs]);

  const statusData = useMemo(() => {
    const open = filteredNCs.filter(nc => nc.ncStatus === 'Open').length;
    const awaiting = filteredNCs.filter(nc => nc.ncStatus === 'Awaiting Review').length;
    const closed = filteredNCs.filter(nc => nc.ncStatus === 'Closed').length;
    return [
      { name: 'Open', value: open },
      { name: 'Awaiting Review', value: awaiting },
      { name: 'Closed', value: closed }
    ];
  }, [filteredNCs]);

  const planTrendData = useMemo(() => {
    const trends: Record<string, number> = {};
    // Use all NCs for trend comparison
    ncs.forEach(nc => {
      const my = new Date(nc.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      trends[my] = (trends[my] || 0) + 1;
    });
    return Object.entries(trends)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [ncs]);

  const handleCloseClick = (nc: NC, viewOnly: boolean = false) => {
    setSelectedNC(nc);
    setClosureData({
      rootCause: nc.rootCause || '',
      correctiveAction: nc.correctiveAction || '',
      auditeeCompletionDate: nc.auditeeCompletionDate || '',
      pointToCheckInNextAudit: nc.pointToCheckInNextAudit || ''
    });
    setIsViewOnly(viewOnly);
    setIsModalOpen(true);
  };

  const handleUpdateNC = async (nextStatus: 'Open' | 'Awaiting Review' | 'Closed') => {
    if (!selectedNC) return;

    setClosing(true);
    try {
      const updateData: any = {
        ...closureData,
        ncStatus: nextStatus,
        closedBy: nextStatus === 'Closed' ? `${user?.firstName} ${user?.lastName}` : undefined,
      };

      await api.patch(`/audit-executions/${selectedNC.executionId}/nc/${selectedNC.id}`, updateData);
      setIsModalOpen(false);
      fetchNCs();
    } catch (error) {
      console.error('Failed to update NC:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setClosing(false);
    }
  };

  const isUserAuditorOfNC = (nc: NC) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'auditor') return true;

    const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const userEmail = user.email?.toLowerCase().trim();

    return Boolean(
      nc.auditors?.some(a => {
        if (a.id && user.id && a.id === user.id) return true;
        if (a.email && userEmail && a.email.toLowerCase().trim() === userEmail) return true;
        if (a.name && userFullName && a.name.toLowerCase().trim() === userFullName) return true;
        return false;
      })
    );
  };

  const isUserAuditeeOfNC = (nc: NC) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Boolean(user.department && nc.department && user.department.toLowerCase().trim() === nc.department.toLowerCase().trim());
  };

  const canClose = (nc: NC) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const isAuditor = isUserAuditorOfNC(nc);
    const isAuditee = isUserAuditeeOfNC(nc);

    if (nc.ncStatus === 'Open') {
      return isAuditee || isAuditor;
    } else if (nc.ncStatus === 'Awaiting Review') {
      return isAuditor;
    } else if (nc.ncStatus === 'Closed') {
      return isAuditor;
    }
    return isAuditor || isAuditee;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Loading NC tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Filter Section - Solidified for Scroll */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 bg-white/95 backdrop-blur-lg py-5 z-30 border-b border-slate-200 shadow-sm -mx-4 px-4 sm:-mx-8 sm:px-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-indigo-600" />
            NC Tracking Dashboard
          </h1>
          <p className="text-slate-500 font-medium mt-1">Non-Conformance monitoring and closure tracking</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search NCs..."
              className="pl-10 pr-4 py-2.5 w-full md:w-64 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none font-medium text-slate-700"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
            >
              {auditPlans.map(plan => (
                <option key={plan} value={plan}>{plan === 'All' ? 'All Audit Plans' : plan}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setBriefingState({ isOpen: true, department: user?.department || 'Planning' })}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
            title="AI Pre-Audit Briefing & Risk Predictor"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>AI Risk Briefing</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total NCs', value: filteredNCs.length, icon: Database, color: 'bg-indigo-500' },
          { label: 'Open', value: filteredNCs.filter(n => n.ncStatus === 'Open').length, icon: AlertCircle, color: 'bg-rose-500' },
          { label: 'Review', value: filteredNCs.filter(n => n.ncStatus === 'Awaiting Review').length, icon: Clock, color: 'bg-amber-500' },
          { label: 'Closed', value: filteredNCs.filter(n => n.ncStatus === 'Closed').length, icon: CheckCircle2, color: 'bg-emerald-500' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${stat.color} opacity-[0.03] group-hover:opacity-[0.06] transition-all duration-500 group-hover:scale-110`} />
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 text-white`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stat.value}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Department Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" />
            Department-wise NCs
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={60}
                  tick={{ fontSize: 12, fontWeight: 500, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                  {deptData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            NC Status Breakdown
          </h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-sm font-semibold text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{filteredNCs.length}</p>
                <p className="text-xs font-medium text-slate-500 uppercase">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            Audit Plan-wise Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 500, fill: '#94a3b8' }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* NC List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Non-Conformance Records
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Showing {filteredNCs.length} entries
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Observed Date</th>
                <th className="px-6 py-4">Dept / Plan</th>
                <th className="px-6 py-4">NC Statement & Clause</th>
                <th className="px-6 py-4">Closure Detail</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNCs.map((nc, idx) => (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={`${nc.executionId}-${nc.id}`} 
                  className="group hover:bg-slate-50/80 transition-all"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      nc.ncStatus === 'Open' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      nc.ncStatus === 'Awaiting Review' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        nc.ncStatus === 'Open' ? 'bg-rose-500' :
                        nc.ncStatus === 'Awaiting Review' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      } animate-pulse`} />
                      {nc.ncStatus}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-700">{new Date(nc.observedDate || nc.executionDate || nc.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{nc.docNumber || 'NO REF'}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900">{nc.department}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">{new Date(nc.scheduledDate || nc.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                  </td>
                  <td className="px-6 py-5 min-w-[300px]">
                    <div className="text-sm text-slate-600 leading-relaxed line-clamp-2 italic">"{nc.ncStatement}"</div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                          ISO {nc.clause}
                        </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {nc.ncStatus === 'Closed' ? (
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500 font-medium truncate max-w-[200px]" title={nc.correctiveAction}>
                          <span className="font-bold text-slate-700 mr-1">CA:</span>
                          {nc.correctiveAction}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
                          <CheckCircle2 className="w-3 h-3" />
                          Closed by {nc.closedBy}
                        </div>
                      </div>
                    ) : nc.ncStatus === 'Awaiting Review' ? (
                        <div className="text-xs text-amber-600 font-bold animate-pulse flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Awaiting Auditor Review
                        </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium italic">Pending Auditee Action...</div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleCloseClick(nc, true)}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="View Full Details"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={() => handleCloseClick(nc, false)}
                      disabled={!canClose(nc)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 ${
                        nc.ncStatus === 'Closed'
                          ? 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'
                          : nc.ncStatus === 'Awaiting Review'
                          ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20'
                      } active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {nc.ncStatus === 'Closed' ? 'Edit Closure' : nc.ncStatus === 'Awaiting Review' ? 'Review NC' : 'Update NC'}
                    </button>
                    {!canClose(nc) && (
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                        {nc.ncStatus === 'Awaiting Review' ? 'Auditor Action Required' : 'Authorized Only'}
                      </p>
                    )}
                  </td>
                </motion.tr>
              ))}
              {filteredNCs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-50 rounded-full">
                           <LayoutDashboard className="w-12 h-12 text-slate-200" />
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold text-lg">No NCs found matching your filters</p>
                          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or selecting a different audit plan</p>
                        </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closure Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-2xl" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden glassmorphism max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {isViewOnly ? 'Full NC Details' : selectedNC?.ncStatus === 'Closed' ? 'Edit NC Closure' : 'NC Closure Workflow'}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    {selectedNC?.department} • Status: <span className={`font-bold ${
                        selectedNC?.ncStatus === 'Open' ? 'text-rose-600' :
                        selectedNC?.ncStatus === 'Awaiting Review' ? 'text-amber-600' :
                        'text-emerald-600'
                    }`}>{selectedNC?.ncStatus}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto max-h-[65vh] lg:max-h-[70vh] flex-1 custom-scrollbar">
                {/* Meta Information Section */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Department</p>
                        <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-2">
                            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-500" />
                            {selectedNC?.department}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observed On</p>
                        <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-rose-500" />
                            {(selectedNC?.observedDate || selectedNC?.executionDate || selectedNC?.date) ? new Date(selectedNC.observedDate || selectedNC.executionDate || selectedNC.date).toLocaleDateString() : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auditors</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {selectedNC?.auditors?.map(a => (
                                <span key={a.id} className="text-[10px] font-bold bg-white text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                                    {a.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Observation Detail */}
                <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">NC Statement & Requirement</h4>
                    <span className="text-[10px] font-bold bg-white text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 italic shadow-sm">
                        Requirement: {selectedNC?.clause}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 italic leading-relaxed font-medium">"{selectedNC?.ncStatement}"</p>
                  
                  {selectedNC?.requirement && (
                     <div className="pt-3 border-t border-indigo-100/50">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Standard / Quality manual ref</p>
                        <p className="text-xs text-slate-600 font-medium">{selectedNC.requirement}</p>
                     </div>
                  )}

                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold bg-white text-rose-600 px-2 py-1 rounded-lg border border-rose-100 uppercase shadow-sm">Target Closure: {new Date(selectedNC?.targetDate || '').toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Auditee Section */}
                  <div className={`space-y-3 p-4 rounded-lg border ${selectedNC?.ncStatus === 'Open' ? 'border-indigo-200 bg-white' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-3 h-3" />
                        Provided by Auditee
                    </h4>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        Root Cause Analysis
                        </label>
                        <textarea
                        required
                        disabled={isViewOnly || selectedNC?.ncStatus !== 'Open'}
                        placeholder="Identify the underlying cause..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500 min-h-[80px]"
                        value={closureData.rootCause}
                        onChange={e => setClosureData({ ...closureData, rootCause: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Corrective Action Taken
                        </label>
                        <textarea
                        required
                        disabled={isViewOnly || selectedNC?.ncStatus !== 'Open'}
                        placeholder="Describe actions taken..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500 min-h-[80px]"
                        value={closureData.correctiveAction}
                        onChange={e => setClosureData({ ...closureData, correctiveAction: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        Completion Date
                        </label>
                        <input
                        required
                        type="date"
                        disabled={isViewOnly || selectedNC?.ncStatus !== 'Open'}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                        value={closureData.auditeeCompletionDate ? closureData.auditeeCompletionDate.split('T')[0] : ''}
                        onChange={e => setClosureData({ ...closureData, auditeeCompletionDate: e.target.value })}
                        />
                    </div>
                  </div>

                  {/* Auditor Section */}
                  {(selectedNC?.ncStatus === 'Awaiting Review' || selectedNC?.ncStatus === 'Closed') && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`space-y-3 p-4 rounded-lg border ${selectedNC?.ncStatus === 'Awaiting Review' ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100 bg-slate-50/50'}`}
                    >
                        <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                            <CheckSquare className="w-3 h-3" />
                            Auditor Verification
                        </h4>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Point to Check in Next Audit
                            </label>
                            <textarea
                            required
                            disabled={isViewOnly || selectedNC?.ncStatus !== 'Awaiting Review'}
                            placeholder="Verification point for the next audit cycle..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500 min-h-[60px]"
                            value={closureData.pointToCheckInNextAudit}
                            onChange={e => setClosureData({ ...closureData, pointToCheckInNextAudit: e.target.value })}
                            />
                        </div>
                        
                        {selectedNC?.ncStatus === 'Closed' && (
                             <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" />
                                Closed by {selectedNC.closedBy} on {new Date(selectedNC.closedDate!).toLocaleDateString()}
                             </div>
                        )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    {isViewOnly ? 'Close View' : 'Cancel'}
                  </button>
                  
                  {!isViewOnly && selectedNC?.ncStatus === 'Open' && (
                    <button
                        type="button"
                        onClick={() => handleUpdateNC('Awaiting Review')}
                        disabled={closing || !closureData.rootCause || !closureData.correctiveAction || !closureData.auditeeCompletionDate}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    >
                        {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Send for Review
                    </button>
                  )}

                  {!isViewOnly && selectedNC?.ncStatus === 'Awaiting Review' && (
                    <>
                        <button
                            type="button"
                            onClick={() => handleUpdateNC('Open')}
                            disabled={closing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-rose-600 border border-rose-200 rounded-xl font-bold hover:bg-rose-50 transition-all"
                        >
                            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Resend for Correction
                        </button>
                        <button
                            type="button"
                            onClick={() => handleUpdateNC('Closed')}
                            disabled={closing || !closureData.pointToCheckInNextAudit}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        >
                            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Approve & Close NC
                        </button>
                    </>
                  )}

                  {/* Additional Logic for Admin editing closed NCs if needed, or simply viewing */}
                  {!isViewOnly && selectedNC?.ncStatus === 'Closed' && user?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateNC('Closed')}
                        disabled={closing}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                      >
                         {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                         Update Record
                      </button>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <PreAuditBriefingModal
        isOpen={briefingState.isOpen}
        onClose={() => setBriefingState({ isOpen: false })}
        department={briefingState.department}
      />

      <style>{`
        .glassmorphism {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
