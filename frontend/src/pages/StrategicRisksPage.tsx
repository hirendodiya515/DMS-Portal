import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, AlertTriangle, Target, ArrowUpRight, ArrowDownRight, Activity, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface StrategicRisk {
  id: string;
  type: 'Risk' | 'Opportunity';
  title: string;
  contextSource: string;
  standards: string[];
  department: string;
  owner: string;
  likelihood: number; // 1-5
  consequence: number; // 1-5
  status: 'Open' | 'Mitigated' | 'Closed';
  actionPlan: string;
}

export default function StrategicRisksPage() {
  const location = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [filterOwner, setFilterOwner] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Extract state if navigated from Context of Organization
  const prefillData = location.state as { text?: string, standards?: string[], type?: 'Risk' | 'Opportunity' };

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isHod = user?.role === 'dept_head';
  const canEdit = isAdmin || isHod;
  const canDelete = isAdmin;

  const [risks, setRisks] = useState<StrategicRisk[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchRisks();
    fetchOwners();
  }, []);

  const fetchRisks = async () => {
    try {
      const resp = await api.get('/strategic-risks');
      setRisks(resp.data);
    } catch (error) {
      console.error('Failed to fetch risks', error);
    }
  };

  const fetchOwners = async () => {
    try {
      const resp = await api.get('/users');
      // Filter for reviewer and departmental head, then map to "FirstName LastName - Department"
      const eligibleUsers = resp.data.filter((u: any) => u.role === 'reviewer' || u.role === 'dept_head');
      const formattedOptions = eligibleUsers.map((u: any) => `${u.firstName} ${u.lastName} - ${u.department || 'No Dept'}`);
      setOwnerOptions(formattedOptions);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const sourceOptions = [
    "Context of Organization (SWOT)",
    "Interested Parties",
    "Management Review",
    "Internal Audit",
    "External Audit",
    "Customer Feedback",
    "Incident Report",
    "Other"
  ];

  const [newRisk, setNewRisk] = useState<Partial<StrategicRisk>>({
    type: 'Risk',
    likelihood: 1,
    consequence: 1,
    standards: [],
    status: 'Open'
  });

  // Automatically open modal and prepopulate if coming from Context Page
  useEffect(() => {
    if (prefillData?.text) {
      setNewRisk(prev => ({
        ...prev,
        title: prefillData.text,
        standards: prefillData.standards || [],
        type: prefillData.type || 'Risk',
        contextSource: 'Context of Organization (SWOT)'
      }));
      setIsAddModalOpen(true);
      // Clear history state so refresh doesn't pop it open again
      window.history.replaceState({}, document.title)
    }
  }, [prefillData]);

  const handleCreate = async () => {
    if (!newRisk.title) return;
    
    try {
      if (editingRiskId) {
        const resp = await api.put(`/strategic-risks/${editingRiskId}`, newRisk);
        setRisks(risks.map(r => r.id === editingRiskId ? resp.data as StrategicRisk : r));
      } else {
        const resp = await api.post('/strategic-risks', newRisk);
        setRisks([resp.data as StrategicRisk, ...risks]);
      }
      
      setIsAddModalOpen(false);
      setNewRisk({ type: 'Risk', likelihood: 1, consequence: 1, standards: [], status: 'Open' });
      setEditingRiskId(null);
    } catch (error) {
       console.error('Error saving risk:', error);
       alert('Failed to save assessment.');
    }
  };

  const openEditModal = (risk: StrategicRisk) => {
    setNewRisk({ ...risk });
    setEditingRiskId(risk.id);
    setIsAddModalOpen(true);
  };

  const handleDeleteRisk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    try {
      await api.delete(`/strategic-risks/${id}`);
      setRisks(risks.filter(r => r.id !== id));
    } catch (error) {
       console.error('Failed to delete risk:', error);
       alert('Failed to delete risk.');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'Open' | 'Mitigated' | 'Closed') => {
    try {
      const resp = await api.patch(`/strategic-risks/${id}/status`, { status: newStatus });
      setRisks(risks.map(r => r.id === id ? { ...r, status: resp.data.status } : r));
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to change status.');
    }
  };

  const getRiskScoreDetails = (likelihood: number, consequence: number) => {
    const score = likelihood * consequence;
    if (score >= 15) return { color: 'bg-red-100 text-red-700', label: 'Extreme' };
    if (score >= 8) return { color: 'bg-orange-100 text-orange-700', label: 'High' };
    if (score >= 4) return { color: 'bg-yellow-100 text-yellow-700', label: 'Medium' };
    return { color: 'bg-green-100 text-green-700', label: 'Low' };
  };

  const filteredRisks = risks.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || r.type === filterType;
    const matchesOwner = filterOwner === 'All' || r.owner === filterOwner;
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchesSearch && matchesType && matchesOwner && matchesStatus;
  });

  // Stats
  const totalRisks = risks.filter(r => r.type === 'Risk').length;
  const totalOps = risks.filter(r => r.type === 'Opportunity').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Strategic Risks & Opportunities</h1>
          <p className="text-slate-500 mt-2">Central corporate register for high-level IMS risks and opportunities (Clause 6.1).</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => { setEditingRiskId(null); setNewRisk({ type: 'Risk', likelihood: 1, consequence: 1, standards: [], status: 'Open' }); setIsAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Entry
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Strategic Risks</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{totalRisks}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <ArrowDownRight className="w-6 h-6 text-rose-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Strategic Opportunities</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{totalOps}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Action Plans</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{risks.filter(r => r.status === 'Open').length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Activity className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search register..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border text-sm font-medium rounded-lg transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-200 overflow-hidden"
            >
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="All">All Types</option>
                    <option value="Risk">Negative Risk</option>
                    <option value="Opportunity">Positive Opportunity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Owner</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white" value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
                    <option value="All">All Owners</option>
                    {ownerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Mitigated">Mitigated</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Type</th>
                <th className="px-6 py-4 font-semibold min-w-[250px]">Description</th>
                <th className="px-6 py-4 font-semibold min-w-[200px]">Source / Standard</th>
                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Score (L x C)</th>
                <th className="px-6 py-4 font-semibold min-w-[200px]">Action Plan</th>
                <th className="px-6 py-4 font-semibold min-w-[180px]">Owner</th>
                <th className="px-6 py-4 font-semibold min-w-[140px]">Status</th>
                {canEdit && <th className="px-6 py-4 font-semibold text-right w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRisks.map((risk) => {
                const scoreDetails = getRiskScoreDetails(risk.likelihood, risk.consequence);
                return (
                  <tr key={risk.id} className="hover:bg-slate-50/50 transition-colors group align-top">
                    <td className="px-6 py-4 text-center">
                      <div className={`p-2 rounded-lg inline-flex ${risk.type === 'Risk' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`} title={risk.type}>
                        {risk.type === 'Risk' ? <AlertTriangle className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800 line-clamp-3 leading-relaxed">{risk.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-max">{risk.contextSource}</span>
                        <div className="flex gap-1 flex-wrap">
                          {risk.standards.map((s: string) => (
                             <span key={s} className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-slate-700">{risk.likelihood * risk.consequence}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-1 ${scoreDetails.color}`}>
                          {scoreDetails.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{risk.actionPlan || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold font-mono">
                          {risk.owner.charAt(0)}{risk.owner.split(' ')[1]?.charAt(0) || ''}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{risk.owner}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block w-full min-w-[130px]">
                        <select 
                          value={risk.status}
                          disabled={!canEdit}
                          onChange={(e) => handleStatusChange(risk.id, e.target.value as any)}
                          className={`w-full appearance-none text-xs font-bold uppercase px-3 py-1.5 rounded-full outline-none transition-colors ${canEdit ? 'cursor-pointer border-r-8 border-transparent' : 'cursor-not-allowed'} ${
                            risk.status === 'Open' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 
                            risk.status === 'Closed' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <option value="Open">OPEN</option>
                          <option value="Mitigated">MITIGATED</option>
                          <option value="Closed">CLOSED</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-1">
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(risk)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Assessment">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDeleteRisk(risk.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Assessment">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredRisks.length === 0 && (
                <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No strategic risks or opportunities found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
               <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                 <h3 className="text-lg font-semibold text-slate-800">{editingRiskId ? 'Edit Strategic Assessment' : 'New Strategic Assessment'}</h3>
                 <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
               </div>
               
               <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                 {/* Type Selection */}
                 <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => setNewRisk({...newRisk, type: 'Risk'})}
                     className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${newRisk.type === 'Risk' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500 hover:border-rose-300'}`}
                   >
                     <AlertTriangle className="w-6 h-6" />
                     <span className="font-semibold">Negative Risk</span>
                   </button>
                   <button 
                     onClick={() => setNewRisk({...newRisk, type: 'Opportunity'})}
                     className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${newRisk.type === 'Opportunity' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-300'}`}
                   >
                     <Target className="w-6 h-6" />
                     <span className="font-semibold">Positive Opportunity</span>
                   </button>
                 </div>

                 {/* Basic Info */}
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={newRisk.title || ''} onChange={e => setNewRisk({...newRisk, title: e.target.value})} placeholder="Describe the risk or opportunity..."></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Source Context</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={newRisk.contextSource || ''} onChange={e => setNewRisk({...newRisk, contextSource: e.target.value})}>
                          <option value="" disabled>Select Source...</option>
                          {sourceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Owner / HOD</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={newRisk.owner || ''} onChange={e => setNewRisk({...newRisk, owner: e.target.value})}>
                          <option value="" disabled>Select Owner...</option>
                          {ownerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                 </div>

                 {/* Scoring */}
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-4">Assessment Matrix (1-5)</h4>
                    <div className="grid grid-cols-2 gap-6">
                       <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Likelihood</label>
                         <input type="range" min="1" max="5" className="w-full" value={newRisk.likelihood} onChange={e => setNewRisk({...newRisk, likelihood: parseInt(e.target.value)})} />
                         <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1 (Rare)</span><span>5 (Almost Certain)</span></div>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Consequence</label>
                         <input type="range" min="1" max="5" className="w-full" value={newRisk.consequence} onChange={e => setNewRisk({...newRisk, consequence: parseInt(e.target.value)})} />
                         <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1 (Insignificant)</span><span>5 (Severe)</span></div>
                       </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                       <span className="font-medium text-slate-700">Calculated Score:</span>
                       <div className="flex items-center gap-3">
                         <span className="text-2xl font-bold text-slate-800">{(newRisk.likelihood || 1) * (newRisk.consequence || 1)}</span>
                         <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getRiskScoreDetails(newRisk.likelihood || 1, newRisk.consequence || 1).color}`}>
                            {getRiskScoreDetails(newRisk.likelihood || 1, newRisk.consequence || 1).label}
                         </span>
                       </div>
                    </div>
                 </div>

                 {/* Action Plan */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Action / Mitigation Plan</label>
                    <textarea rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30" value={newRisk.actionPlan || ''} onChange={e => setNewRisk({...newRisk, actionPlan: e.target.value})} placeholder="Steps to mitigate the risk or leverage the opportunity..."></textarea>
                 </div>

               </div>
               
               <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                 <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                 <button onClick={handleCreate} disabled={!newRisk.title || !newRisk.owner} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                   {editingRiskId ? 'Save Changes' : 'Save Assessment'}
                 </button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
