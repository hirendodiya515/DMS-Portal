import React, { useState, useEffect } from 'react';
import { 
  Leaf, AlertCircle, Clock, CheckCircle2, 
  Eye, Edit, Trash2, FileText, History as HistoryIcon, Plus, Search,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import api from '../lib/api';
import RiskStatsCards from '../components/risks/RiskStatsCards';
import RiskHeatMap from '../components/risks/RiskHeatMap';
import NewActivityForm from '../components/risks/NewActivityForm';
import RiskDetailsModal from '../components/risks/RiskDetailsModal';

const EaaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'register' | 'history'>('summary');
  const [showNewModal, setShowNewModal] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('total');
  const [history, setHistory] = useState<any[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [initialIsEditing, setInitialIsEditing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getLevelColor = (level: string) => {
    const l = (level || '').toLowerCase();
    if (l === 'critical') return { text: 'text-red-600', bg: 'bg-red-600', badge: 'bg-red-50 border-red-200 text-red-700' };
    if (l === 'high') return { text: 'text-orange-600', bg: 'bg-orange-500', badge: 'bg-orange-50 border-orange-200 text-orange-700' };
    if (l === 'medium') return { text: 'text-yellow-600', bg: 'bg-yellow-500', badge: 'bg-yellow-50 border-yellow-200 text-yellow-700' };
    return { text: 'text-green-600', bg: 'bg-green-500', badge: 'bg-green-50 border-green-200 text-green-700' };
  };

  // Client-side item-level filtering
  const computedRisks = React.useMemo(() => {
    if (filterLevel === 'total') return risks;
    return risks
      .map(risk => ({
        ...risk,
        items: (risk.items || []).filter((item: any) => {
          const hasResidual = !!(item.residualLikelihood && item.residualSeverity);
          const effectiveLevel = hasResidual ? (item.residualLevel || item.level) : item.level;
          return (effectiveLevel || '').toLowerCase() === filterLevel.toLowerCase();
        }),
      }))
      .filter(risk => risk.items.length > 0);
  }, [risks, filterLevel]);

  // Auto-expand activities when filter is active
  React.useEffect(() => {
    if (filterLevel !== 'total') {
      setExpandedRows(new Set(computedRisks.map((r: any) => r.id)));
    } else {
      setExpandedRows(new Set());
    }
  }, [filterLevel, risks]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'register') fetchRisks();
    if (activeTab === 'summary') fetchStats();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, filterDept, searchTerm, filterLevel]);

  // Keep selectedRisk in sync with updated list (for modal persistence)
  useEffect(() => {
    if (showDetailsModal && selectedRisk) {
      const updated = risks.find(r => r.id === selectedRisk.id);
      if (updated) setSelectedRisk(updated);
    }
  }, [risks, showDetailsModal]);

  const fetchInitialData = async () => {
    try {
      const deptRes = await api.get('/settings/departments');
      setDepartments(deptRes.data || []);
      await fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/risks/dashboard', { params: { type: 'eaa' } });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRisks = async () => {
    try {
      const res = await api.get('/risks', {
        params: {
          type: 'eaa',
          department: filterDept,
          search: searchTerm,
        }
      });
      setRisks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/risks/all-history', { params: { type: 'eaa' } });
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (risk: any) => {
    if (window.confirm(`Are you sure you want to delete aspect ${risk.riskNumber}?`)) {
      try {
        await api.delete(`/risks/${risk.id}`, { params: { type: 'eaa' } });
        fetchRisks();
        fetchStats();
      } catch (err) {
        console.error(err);
        alert('Failed to delete assessment');
      }
    }
  };

  const handleAction = (risk: any, isEditing: boolean = false) => {
    setSelectedRisk(risk);
    setInitialIsEditing(isEditing);
    setShowDetailsModal(true);
  };

  const chartData = stats?.byDepartment ? Object.entries(stats.byDepartment).map(([name, count]) => ({
    name,
    count,
    color: '#10b981'
  })) : [];

  const statCards = stats ? [
    { label: 'Total Assessments', value: stats.total, change: '+1.5%', trend: 'up' as const, icon: Leaf, color: '#10b981', borderColor: 'border-green-500' },
    { label: 'Significant Aspects', value: stats.byLevel.high + stats.byLevel.critical, change: '-2%', trend: 'down' as const, icon: AlertCircle, color: '#ef4444', borderColor: 'border-red-500' },
    { label: 'Due Reviews', value: stats.byStatus.pending_review, change: '+5%', trend: 'up' as const, icon: Clock, color: '#f59e0b', borderColor: 'border-yellow-500' },
    { label: 'Compliance Status', value: 'Active', icon: CheckCircle2, color: '#3b82f6', borderColor: 'border-blue-500' },
  ] : [];

  return (
    <div className="p-4 max-w-[1400px] mx-auto min-h-screen bg-[#f8fafc]">
       {/* Page Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">EAA (ISO 14001)</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Environmental Aspect and Impact Assessment Matrix</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {['summary', 'register', 'history'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'summary' && <FileText className="w-4 h-4" />}
              {tab === 'register' && <Leaf className="w-4 h-4" />}
              {tab === 'history' && <HistoryIcon className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RiskStatsCards stats={statCards} />
          
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
            <div>
              <RiskHeatMap matrix={stats?.matrix || {}} />
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col flex-1">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Aspects by Dept</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Environmental Load distribution</p>
                  </div>
                </div>
                
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8', dy: 8 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" />
                      <YAxis type="number" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={28}>
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

               <div className="bg-emerald-600 rounded-2xl p-6 text-white relative overflow-hidden group shadow-xl shadow-emerald-50">
                <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl transition-transform duration-700"></div>
                <h3 className="text-xl font-bold mb-2 leading-tight tracking-tight uppercase">Assess Impacts</h3>
                <p className="text-emerald-50 text-[10px] mb-6 leading-relaxed font-bold uppercase tracking-wider opacity-80">Systematically record and manage environmental aspects of operations.</p>
                <button 
                  onClick={() => setShowNewModal(true)}
                  className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-50 transition-all shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  NEW ASSESSMENT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'register' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search aspects or departments..."
                    className="w-full pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all text-sm font-bold text-slate-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                   {['total', 'low', 'medium', 'high', 'critical'].map(level => (
                    <button 
                      key={level}
                      onClick={() => setFilterLevel(level)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${filterLevel === level ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  className="bg-slate-50 border border-slate-100 px-5 py-2.5 rounded-xl text-[10px] font-bold text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-emerald-100 appearance-none bg-no-repeat bg-[right_1rem_center] cursor-pointer pr-10"
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                >
                  <option value="all">ALL DEPT</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
           </div>

           <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-sm">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50/50 border-b border-slate-100">
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aspect / Consequence</th>
                   <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">L</th>
                   <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">S</th>
                   <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Rating</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Impact Level</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {computedRisks.map((risk: any, i: number) => {
                   const isExpanded = expandedRows.has(risk.id);
                   const maxLevel = risk.maxRiskLevel || risk.riskLevel || '';
                    const hasAnyResidual = risk.items?.some((it: any) => it.residualLikelihood && it.residualSeverity);
                    const effectiveLevel = hasAnyResidual ? (() => {
                      const priority: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                      return (risk.items || []).reduce((max: string, it: any) => {
                        const lvl = ((it.residualLevel || it.level) || 'low').toLowerCase();
                        return (priority[lvl] || 0) > (priority[max] || 0) ? lvl : max;
                      }, 'low');
                    })() : maxLevel;
                    const maxColors = getLevelColor(effectiveLevel);
                   return (
                     <React.Fragment key={risk.id || i}>
                       {/* ── Activity (Parent) Row ── */}
                       <tr
                         className="hover:bg-slate-50/80 transition-colors group cursor-pointer border-b border-slate-100"
                         onClick={() => toggleExpand(risk.id)}
                       >
                         <td className="px-8 py-5">
                           <div className="flex items-center gap-3">
                             <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform ${isExpanded ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                               {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                             </div>
                             <div>
                               <div className="font-black text-slate-900 text-[14px] tracking-tight">{risk.process || risk.title}</div>
                               <span className="mt-1 inline-block px-2 py-0.5 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest rounded">
                                 {risk.items?.length || 0} ASPECTS
                               </span>
                             </div>
                           </div>
                         </td>
                         {/* col2: Aspect/Consequence &mdash; blank for parent */}
                         <td className="px-8 py-5 text-slate-300 text-xs font-bold">&mdash;</td>
                         {/* col3-5: L / S / Rating &mdash; blank for parent */}
                         <td className="px-6 py-5 text-center text-slate-300 text-xs font-bold">&mdash;</td>
                         <td className="px-6 py-5 text-center text-slate-300 text-xs font-bold">&mdash;</td>
                         <td className="px-6 py-5 text-center text-slate-300 text-xs font-bold">&mdash;</td>
                         <td className="px-8 py-5">
                           <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${maxColors.text}`}>
                             <div className={`w-2.5 h-2.5 rounded-full shadow-sm animate-pulse ${maxColors.bg}`}></div>
                             {effectiveLevel || 'N/A'}
                           </span>
                         </td>
                         <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={() => handleAction(risk, false)} className="p-2.5 bg-white text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-100 shadow-sm" title="View Details">
                               <Eye className="w-4 h-4" />
                             </button>
                             <button onClick={() => handleAction(risk, true)} className="p-2.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-slate-100 shadow-sm" title="Edit Assessment">
                               <Edit className="w-4 h-4" />
                             </button>
                             <button onClick={() => handleDelete(risk)} className="p-3 bg-white text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all border border-slate-100 shadow-sm">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </td>
                       </tr>
                       {/* ── Aspect Item (Child) Rows ── */}
                       {isExpanded && risk.items && risk.items.map((item: any, idx: number) => {
                         const hasResidual = !!(item.residualLikelihood && item.residualSeverity);
                          const displayL = hasResidual ? item.residualLikelihood : item.likelihood;
                          const displayS = hasResidual ? item.residualSeverity : item.severity;
                          const displayRating = hasResidual ? item.residualRating : item.rating;
                          const displayLevel = hasResidual ? (item.residualLevel || item.level) : item.level;
                          const itemColors = getLevelColor(displayLevel);
                         return (
                           <tr key={item.id || idx} className="bg-slate-50/40 border-b border-slate-100/60 hover:bg-emerald-50/20 transition-colors">
                             <td className="px-8 py-4">
                               <div className="flex flex-col pl-8 border-l-2 border-slate-100 ml-3">
                                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">#{idx + 1}</span>
                                 {item.subActivity && (
                                   <div className="mt-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded leading-tight max-w-[140px]">
                                     &#8627; {item.subActivity}
                                   </div>
                                 )}
                               </div>
                             </td>
                             {/* col2: Aspect name + consequence */}
                             <td className="px-8 py-4">
                               <div className="text-[13px] font-bold text-slate-700 leading-tight">{item.hazardOrAspect}</div>
                               {item.consequenceOrImpact && (
                                 <div className="text-[11px] text-slate-400 mt-0.5 font-medium">&#8627; {item.consequenceOrImpact}</div>
                               )}
                             </td>
                             <td className="px-6 py-4 text-center">
                               <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-[12px] font-black text-slate-600 flex items-center justify-center mx-auto shadow-sm">{displayL}</span>
                             </td>
                             <td className="px-6 py-4 text-center">
                               <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-[12px] font-black text-slate-600 flex items-center justify-center mx-auto shadow-sm">{displayS}</span>
                             </td>
                             <td className="px-6 py-4 text-center">
                               <span className={`w-10 h-8 rounded-xl text-[12px] font-black flex items-center justify-center mx-auto border ${itemColors.badge}`}>{displayRating}</span>
                             </td>
                             <td className="px-8 py-4">
                               <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest ${itemColors.badge}`}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${itemColors.bg}`}></div>
                                 {displayLevel}
                                 {hasResidual && <span className="text-[7px] opacity-60 ml-0.5">(R)</span>}
                               </span>
                             </td>
                             <td></td>
                           </tr>
                         );
                       })}
                     </React.Fragment>
                   );
                 })}
                  {computedRisks.length === 0 && (
                   <tr>
                     <td colSpan={7} className="px-6 py-28 text-center bg-slate-50/20">
                       <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                             <Leaf className="w-10 h-10 text-slate-200" />
                          </div>
                          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">No environmental assessment data</p>
                          <button 
                            onClick={() => {setSearchTerm(''); setFilterLevel('total'); setFilterDept('all');}}
                            className="text-emerald-600 text-[10px] font-black uppercase underline tracking-widest"
                          >
                             RESET SEARCH
                          </button>
                       </div>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <div>
                 <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Sustainability Audit Log</h2>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Traceability of environmental impact measurements</p>
               </div>
               <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                 INTERNAL LEDGER
               </div>
            </div>
            <div className="divide-y divide-slate-50">
              {history.map((item, i) => (
                <div key={i} className="p-8 hover:bg-slate-50/50 transition-colors flex items-start gap-6 group">
                  <div className={`p-4 rounded-3xl shrink-0 ${
                    item.action === 'CREATE' ? 'bg-green-100 text-green-600 shadow-lg shadow-green-100/50' :
                    item.action === 'UPDATE' ? 'bg-blue-100 text-blue-600 shadow-lg shadow-blue-100/50' :
                    item.action === 'DELETE' ? 'bg-red-100 text-red-600 shadow-lg shadow-red-100/50' :
                    'bg-slate-100 text-slate-600 shadow-lg shadow-slate-100/50'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-slate-900 text-lg tracking-tight uppercase">{item.action}</span>
                      <span className="text-[10px] font-black text-slate-400 font-mono tracking-tighter uppercase">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed italic">"{item.details}"</p>
                    <div className="flex items-center gap-4 mt-4 text-[9px] font-black uppercase tracking-widest">
                       <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                         OPERATOR: <span className="text-slate-900 font-black italic">{item.user?.username || 'SYSTEM'}</span>
                       </div>
                       {item.eaaRiskId && (
                         <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                           REC_REF: <span className="font-mono text-emerald-600 font-black">{item.eaaRiskId.substring(0, 8)}</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              ))}
               {history.length === 0 && (
                <div className="p-28 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-slate-100">
                    <HistoryIcon className="w-12 h-12 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Zero activities detected</h3>
                  <p className="text-slate-400 mt-3 font-medium text-xs">Sustainability logs will appear here upon record entry.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewActivityForm 
          type="eaa"
          onClose={() => setShowNewModal(false)}
          departments={departments}
          onSubmit={async (data) => {
            await api.post('/risks', { ...data, type: 'eaa' });
            setShowNewModal(false);
            fetchStats();
            if (activeTab === 'register') fetchRisks();
          }}
        />
      )}

      {showDetailsModal && selectedRisk && (
        <RiskDetailsModal 
          type="eaa"
          risk={selectedRisk}
          initialIsEditing={initialIsEditing}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRisk(null);
          }}
          onUpdate={() => {
            fetchRisks();
            fetchStats();
          }}
          departments={departments}
        />
      )}
    </div>
  );
};

export default EaaPage;
