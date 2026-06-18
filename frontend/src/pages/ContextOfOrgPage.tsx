import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, FileText, Plus, AlertTriangle, ArrowRight, CheckCircle2, Target, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

/* --- Data Interfaces --- */
interface Issue {
  id: string;
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
  text: string;
  impact: 'low' | 'medium' | 'high';
  standards: string[];
  isConverted?: boolean;
}

interface Party {
  id: string;
  name: string;
  standards: string[];
  needs: string;
  risk: 'Low' | 'Medium' | 'High';
  actions: string[];
  responsible?: string;
}

export default function ContextOfOrgPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('swot');
  
  // Convert to Risk Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // --- Dynamic State ---
  const [issues, setIssues] = useState<Issue[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [scopeText, setScopeText] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [issuesSearchTerm, setIssuesSearchTerm] = useState("");

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [issuesRes, partiesRes, scopeRes, deptsRes] = await Promise.all([
        api.get('/org-context/issues'),
        api.get('/org-context/parties'),
        api.get('/org-context/scope'),
        api.get('/settings/departments').catch(() => ({ data: [] }))
      ]);
      setIssues(issuesRes.data);
      setParties(partiesRes.data);
      setDepartments(deptsRes.data || []);
      
      const scopeData = scopeRes.data;
      if (scopeData && typeof scopeData === 'string') {
        setScopeText(scopeData);
      } else if (scopeData?.content) {
        setScopeText(scopeData.content);
      }
    } catch (error) {
      console.error('Failed to fetch org context data:', error);
    }
  };

  // UI Modal Controls
  const [isAddIssueOpen, setIsAddIssueOpen] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isEditScopeOpen, setIsEditScopeOpen] = useState(false);

  // New Issue / Party Form State
  const [newIssue, setNewIssue] = useState<Partial<Issue>>({ category: 'strength', impact: 'low', standards: ['ISO 9001'] });
  const [newParty, setNewParty] = useState<Partial<Party>>({ risk: 'Medium', standards: ['ISO 9001'], actions: [] });
  const [tempAction, setTempAction] = useState("");
  const [tempScopeText, setTempScopeText] = useState(scopeText);

  // Editing State
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);

  // Handlers
  const handleConvertToRisk = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsConvertModalOpen(true);
  };

  const handleRiskSelection = async () => {
    setIsConvertModalOpen(false);
    if (!selectedIssue) return;
    
    try {
      await api.put(`/org-context/issues/${selectedIssue.id}`, { isConverted: true });
      const updatedIssues = issues.map(i => i.id === selectedIssue.id ? { ...i, isConverted: true } : i);
      setIssues(updatedIssues);

      // Route to the new Strategic Risks page, passing the issue data
      navigate('/risks/strategic', { 
        state: { 
          text: selectedIssue.text,
          standards: selectedIssue.standards,
          type: selectedIssue.category === 'opportunity' || selectedIssue.category === 'strength' ? 'Opportunity' : 'Risk'
        } 
      });
    } catch (error) {
      console.error('Failed to convert issue to risk', error);
      alert('Failed to mark issue as converted.');
    }
  };

  const handleAddIssue = async () => {
    if (!newIssue.text) return;
    try {
      if (editingIssueId) {
        const res = await api.put(`/org-context/issues/${editingIssueId}`, newIssue);
        setIssues(issues.map(i => i.id === editingIssueId ? res.data : i));
      } else {
        const res = await api.post('/org-context/issues', newIssue);
        setIssues([res.data, ...issues]);
      }
      setIsAddIssueOpen(false);
      setNewIssue({ category: 'strength', impact: 'low', standards: ['ISO 9001'] });
      setEditingIssueId(null);
    } catch (error) {
      console.error('Failed to save issue:', error);
      alert('Failed to save issue. Please try again.');
    }
  };

  const openEditIssueModal = (issue: Issue) => {
    setNewIssue(issue);
    setEditingIssueId(issue.id);
    setIsAddIssueOpen(true);
  };

  const handleDeleteIssue = async (id: string) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;
    try {
      await api.delete(`/org-context/issues/${id}`);
      setIssues(issues.filter(i => i.id !== id));
    } catch (error) {
       console.error('Failed to delete issue:', error);
       alert('Failed to delete issue.');
    }
  };

  const handleAddParty = async () => {
    if (!newParty.name || !newParty.needs) return;
    
    let finalActions = newParty.actions || [];
    if (tempAction.trim()) {
      finalActions = [...finalActions, tempAction.trim()];
    }

    try {
      if (editingPartyId) {
        const res = await api.put(`/org-context/parties/${editingPartyId}`, { ...newParty, actions: finalActions });
        setParties(parties.map(p => p.id === editingPartyId ? res.data : p));
      } else {
        const res = await api.post('/org-context/parties', { ...newParty, actions: finalActions });
        setParties([res.data, ...parties]);
      }
      setIsAddPartyOpen(false);
      setNewParty({ risk: 'Medium', standards: ['ISO 9001'], actions: [] });
      setTempAction("");
      setEditingPartyId(null);
    } catch (error) {
      console.error('Failed to save party:', error);
      alert('Failed to save Interested Party. Please try again.');
    }
  };

  const openEditPartyModal = (party: Party) => {
    setNewParty({ ...party });
    setEditingPartyId(party.id);
    setIsAddPartyOpen(true);
  };

  const handleAddActionField = () => {
    if (tempAction.trim()) {
      setNewParty(prev => ({ ...prev, actions: [...(prev.actions || []), tempAction.trim()] }));
      setTempAction("");
    }
  };

  const handleRemoveActionField = (index: number) => {
     setNewParty(prev => ({ ...prev, actions: prev.actions?.filter((_, i) => i !== index) }));
  };

  const handleDeleteParty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interested party requirement?')) return;
    try {
      await api.delete(`/org-context/parties/${id}`);
      setParties(parties.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete interested party:', error);
      alert('Failed to delete interested party. Please try again.');
    }
  };

  const handleSaveScope = () => {
    setScopeText(tempScopeText);
    setIsEditScopeOpen(false);
  };

  const tabs = [
    { id: 'swot', label: 'Internal & External Issues', icon: LayoutDashboard },
    { id: 'stakeholders', label: 'Interested Parties', icon: Users },
    { id: 'scope', label: 'IMS Scope', icon: FileText },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Context of the Organization (IMS)</h1>
          <p className="text-slate-500 mt-2">Manage internal and external issues, stakeholder needs, and the IMS scope for ISO 9001, 14001, and 45001.</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-sm">Status: Approved by Top Management</span>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative whitespace-nowrap ${
                activeTab === tab.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-slate-50/50 min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'swot' && (() => {
              const filteredIssues = issues.filter(i => {
                const term = issuesSearchTerm.toLowerCase();
                return (
                  i.text.toLowerCase().includes(term) ||
                  i.standards.some(std => std.toLowerCase().includes(term)) ||
                  i.impact.toLowerCase().includes(term)
                );
              });

              return (
                <motion.div
                  key="swot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-slate-800">Internal & External Issues <p className="text-xs text-slate-500 mt-1">Document no.: L1/4.1</p></h2>
                    <div className="flex items-center gap-3">
                      <div className="relative min-w-[280px]">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input 
                          type="text"
                          placeholder="Search issues or standards..."
                          value={issuesSearchTerm}
                          onChange={e => setIssuesSearchTerm(e.target.value)}
                          className="pl-9 pr-4 py-2 w-full text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                        />
                        {issuesSearchTerm && (
                          <button onClick={() => setIssuesSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {isAdmin && (
                        <button onClick={() => { setEditingIssueId(null); setNewIssue({ category: 'strength', impact: 'low', standards: ['ISO 9001'] }); setIsAddIssueOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm shrink-0">
                          <Plus className="w-4 h-4" />
                          Add Issue
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Strengths (Internal)
                        </h3>
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-md font-medium">Helpful</span>
                      </div>
                      <div className="p-4 space-y-3 flex-1">
                        {filteredIssues.filter(i => i.category === 'strength').map(issue => (
                          <IssueCard key={issue.id} issue={issue} onDelete={isAdmin ? () => handleDeleteIssue(issue.id) : undefined} onEdit={isAdmin ? () => openEditIssueModal(issue) : undefined} />
                        ))}
                        {filteredIssues.filter(i => i.category === 'strength').length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">No strengths recorded.</p>
                        )}
                      </div>
                    </div>

                    {/* Weaknesses */}
                    <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
                        <h3 className="font-semibold text-rose-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          Weaknesses (Internal)
                        </h3>
                        <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-md font-medium">Harmful</span>
                      </div>
                      <div className="p-4 space-y-3 flex-1">
                        {filteredIssues.filter(i => i.category === 'weakness').map(issue => (
                           <IssueCard key={issue.id} issue={issue} onDelete={isAdmin ? () => handleDeleteIssue(issue.id) : undefined} onEdit={isAdmin ? () => openEditIssueModal(issue) : undefined} convertible onConvert={() => handleConvertToRisk(issue)} />
                        ))}
                        {filteredIssues.filter(i => i.category === 'weakness').length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">No weaknesses recorded.</p>
                        )}
                      </div>
                    </div>

                    {/* Opportunities */}
                    <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Opportunities (External)
                        </h3>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md font-medium">Helpful</span>
                      </div>
                      <div className="p-4 space-y-3 flex-1">
                         {filteredIssues.filter(i => i.category === 'opportunity').map(issue => (
                           <IssueCard key={issue.id} issue={issue} onDelete={isAdmin ? () => handleDeleteIssue(issue.id) : undefined} onEdit={isAdmin ? () => openEditIssueModal(issue) : undefined} convertible onConvert={() => handleConvertToRisk(issue)} />
                        ))}
                         {filteredIssues.filter(i => i.category === 'opportunity').length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">No opportunities recorded.</p>
                        )}
                      </div>
                    </div>

                    {/* Threats */}
                    <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                        <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          Threats (External)
                        </h3>
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-md font-medium">Harmful</span>
                      </div>
                      <div className="p-4 space-y-3 flex-1">
                        {filteredIssues.filter(i => i.category === 'threat').map(issue => (
                           <IssueCard key={issue.id} issue={issue} onDelete={isAdmin ? () => handleDeleteIssue(issue.id) : undefined} onEdit={isAdmin ? () => openEditIssueModal(issue) : undefined} convertible onConvert={() => handleConvertToRisk(issue)} />
                        ))}
                        {filteredIssues.filter(i => i.category === 'threat').length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">No threats recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {activeTab === 'stakeholders' && (() => {
              // Filter and group parties
              const filteredParties = parties.filter(p => {
                const term = searchTerm.toLowerCase();
                return (
                  p.name.toLowerCase().includes(term) ||
                  p.needs.toLowerCase().includes(term) ||
                  (p.responsible && p.responsible.toLowerCase().includes(term)) ||
                  (p.actions && p.actions.some(act => act.toLowerCase().includes(term)))
                );
              });

              // Group parties by name case-insensitively while preserving order
              const groupedPartiesList: { name: string; items: Party[] }[] = [];
              filteredParties.forEach(p => {
                const nameKey = p.name.trim().toLowerCase();
                let group = groupedPartiesList.find(g => g.name.toLowerCase() === nameKey);
                if (!group) {
                  group = { name: p.name.trim(), items: [] };
                  groupedPartiesList.push(group);
                }
                group.items.push(p);
              });

              return (
                <motion.div
                  key="stakeholders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">Interested Parties<p className="text-xs text-slate-500 mt-1">Document no.: L1/4.2</p></h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative min-w-[280px]">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input 
                          type="text"
                          placeholder="Search party, need, action..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="pl-9 pr-4 py-2 w-full text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                        />
                        {searchTerm && (
                          <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {isAdmin && (
                        <button onClick={() => { setEditingPartyId(null); setNewParty({ risk: 'Medium', standards: ['ISO 9001'], actions: [] }); setIsAddPartyOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm shrink-0">
                          <Plus className="w-4 h-4" />
                          Add Party
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                            <th className="px-6 py-4 font-medium w-[18%]">Interested Party</th>
                            <th className="px-6 py-4 font-medium w-[12%]">Standards</th>
                            <th className="px-6 py-4 font-medium w-[23%] whitespace-normal">Needs & Expectations</th>
                            <th className="px-6 py-4 font-medium w-[10%]">Risk</th>
                            <th className="px-6 py-4 font-medium w-[22%]">Mitigations / Actions</th>
                            <th className="px-6 py-4 font-medium w-[10%]">Responsible</th>
                            {isAdmin && <th className="px-6 py-4 font-medium w-[5%] text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupedPartiesList.map(group => {
                            return group.items.map((party, index) => (
                              <PartyRow 
                                key={party.id}
                                party={party}
                                isFirst={index === 0}
                                rowSpan={group.items.length}
                                isLastOfGroup={index === group.items.length - 1}
                                onDelete={isAdmin ? () => handleDeleteParty(party.id) : undefined}
                                onEdit={isAdmin ? () => openEditPartyModal(party) : undefined}
                                isAdmin={isAdmin}
                              />
                            ));
                          })}
                          {groupedPartiesList.length === 0 && (
                             <tr>
                               <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500 text-sm">
                                 {searchTerm ? "No matching interested parties found." : "No interested parties added yet."}
                               </td>
                             </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {activeTab === 'scope' && (
              <motion.div
                key="scope"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-slate-800">IMS Scope Statement<p className="text-xs text-slate-500 mt-1">Document no.: L1/4.3</p></h2>
                  {isAdmin && (
                    <button onClick={() => { setTempScopeText(scopeText); setIsEditScopeOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium shadow-sm">
                      Edit Document
                    </button>
                  )}
                </div>
                
                {/* Document View */}
                <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm prose prose-slate max-w-none">
                  <h3>Scope of the Integrated Management System (IMS)</h3>
                  {scopeText.split('\n').map((paragraph, i) => (
                    <p key={i} className="text-slate-600 leading-relaxed min-h-[1rem]">
                      {/* Very basic bold rendering for "**text**" */}
                      {paragraph.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                    </p>
                  ))}
                  
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <h4 className="flex items-center gap-2 text-slate-800 not-prose mb-4 font-semibold">
                      <AlertTriangle className="w-5 h-5 text-indigo-500" />
                      Justified Exclusions
                    </h4>
                    <p className="text-sm text-slate-500 mb-4 not-prose">
                      Note: Exclusions are only permitted within the scope of the QMS (ISO 9001). The EMS (ISO 14001) and OH&S (ISO 45001) apply to the entirety of operations without exclusion.
                    </p>
                    <ul className="space-y-3 not-prose">
                      <li className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">ISO 9001: Clause 8.3</span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 w-max mt-1">Quality Only</span>
                        </div>
                        <div>
                          <strong className="block text-slate-800">Design and development of products and services</strong>
                          <span className="text-sm text-slate-500 block mt-1">Justification: Our organization manufactures products based entirely on customer-provided specifications and drawings. We do not engage in any product design activities.</span>
                        </div>
                      </li>
                      <li className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-100">
                         <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">ISO 9001: Clause 8.5.3</span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 w-max mt-1">Quality Only</span>
                        </div>
                        <div>
                          <strong className="block text-slate-800">Property belonging to customers or external providers</strong>
                          <span className="text-sm text-slate-500 block mt-1">Justification: We do not handle, store, or possess any property belonging to customers or external providers during our operations.</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Add Issue Modal */}
      <AnimatePresence>
        {isAddIssueOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
               <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                 <h3 className="text-lg font-semibold text-slate-800">{editingIssueId ? 'Edit Issue' : 'Add New Issue'}</h3>
                 <button onClick={() => setIsAddIssueOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-6 space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Issue Description</label>
                   <textarea rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newIssue.text || ''} onChange={e => setNewIssue({...newIssue, text: e.target.value})} placeholder="Describe the issue..."></textarea>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={newIssue.category} onChange={e => setNewIssue({...newIssue, category: e.target.value as any})}>
                        <option value="strength">Strength (Internal)</option>
                        <option value="weakness">Weakness (Internal)</option>
                        <option value="opportunity">Opportunity (External)</option>
                        <option value="threat">Threat (External)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Impact Level</label>
                      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={newIssue.impact} onChange={e => setNewIssue({...newIssue, impact: e.target.value as any})}>
                        <option value="low">Low Impact</option>
                        <option value="medium">Medium Impact</option>
                        <option value="high">High Impact</option>
                      </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Applicable Standards</label>
                    <div className="flex flex-col gap-2">
                       {['ISO 9001', 'ISO 14001', 'ISO 45001'].map(std => (
                         <label key={std} className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                             checked={newIssue.standards?.includes(std)}
                             onChange={(e) => {
                               const stds = newIssue.standards || [];
                               if (e.target.checked) setNewIssue({...newIssue, standards: [...stds, std]});
                               else setNewIssue({...newIssue, standards: stds.filter(s => s !== std)});
                             }}
                           />
                           <span className="text-sm text-slate-700">{std}</span>
                         </label>
                       ))}
                    </div>
                 </div>
               </div>
               <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                 <button onClick={() => setIsAddIssueOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                 <button onClick={handleAddIssue} disabled={!newIssue.text || newIssue.standards?.length === 0} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{editingIssueId ? 'Save Changes' : 'Add Issue'}</button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* 2. Add Party Modal */}
      <AnimatePresence>
        {isAddPartyOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
               <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                 <h3 className="text-lg font-semibold text-slate-800">{editingPartyId ? 'Edit Interested Party' : 'Add Interested Party'}</h3>
                 <button onClick={() => setIsAddPartyOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Party Name</label>
                   <input 
                     type="text" 
                     list="existing-party-names"
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                     value={newParty.name || ''} 
                     onChange={e => setNewParty({...newParty, name: e.target.value})} 
                     placeholder="e.g. Employees, Customer, Suppliers" 
                   />
                   <datalist id="existing-party-names">
                     {Array.from(new Set(parties.map(p => p.name.trim()))).map(name => (
                       <option key={name} value={name} />
                     ))}
                   </datalist>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Applicable Standards</label>
                    <div className="flex gap-4">
                       {['ISO 9001', 'ISO 14001', 'ISO 45001'].map(std => (
                         <label key={std} className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" className="rounded text-blue-600 w-4 h-4" 
                             checked={newParty.standards?.includes(std)}
                             onChange={(e) => {
                               const stds = newParty.standards || [];
                               if (e.target.checked) setNewParty({...newParty, standards: [...stds, std]});
                               else setNewParty({...newParty, standards: stds.filter(s => s !== std)});
                             }}
                           />
                           <span className="text-sm text-slate-700">{std}</span>
                         </label>
                       ))}
                    </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Needs & Expectations</label>
                   <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" value={newParty.needs || ''} onChange={e => setNewParty({...newParty, needs: e.target.value})} placeholder="What do they expect from the IMS?"></textarea>
                 </div>
                 <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Risk if Unmet</label>
                       <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold text-slate-700" value={newParty.risk} onChange={e => setNewParty({...newParty, risk: e.target.value as any})}>
                         <option value="Low">Low Risk</option>
                         <option value="Medium">Medium Risk</option>
                         <option value="High">High Risk</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Responsible Department</label>
                       <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-slate-700" value={newParty.responsible || ''} onChange={e => setNewParty({...newParty, responsible: e.target.value})}>
                         <option value="">Select Department</option>
                         {departments.map(d => (
                           <option key={d} value={d}>{d}</option>
                         ))}
                       </select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mitigations / Actions</label>
                      
                      {/* Added Actions List */}
                      {newParty.actions && newParty.actions.length > 0 && (
                        <ul className="mb-3 space-y-2">
                          {newParty.actions.map((act, i) => (
                             <li key={i} className="flex justify-between items-center text-sm bg-slate-50 border border-slate-200 p-2 rounded-md text-slate-700">
                               <span>{act}</span>
                               <button onClick={() => handleRemoveActionField(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                 <X className="w-4 h-4" />
                               </button>
                             </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex gap-2">
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={tempAction} onChange={e => setTempAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddActionField())} placeholder="Type an action and press Enter or add..." />
                        <button type="button" onClick={handleAddActionField} className="px-3 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors shrink-0">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                 </div>
               </div>
               <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                 <button onClick={() => setIsAddPartyOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                 <button onClick={handleAddParty} disabled={!newParty.name || !newParty.needs} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{editingPartyId ? 'Save Changes' : 'Add Party'}</button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* 3. Edit Scope Modal */}
      <AnimatePresence>
        {isEditScopeOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
               <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                 <h3 className="text-lg font-semibold text-slate-800">Edit IMS Scope Statement</h3>
                 <button onClick={() => setIsEditScopeOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-6">
                 <p className="text-sm text-slate-500 mb-4">Provide a high-level overview of your organization's scope. Note that Justified Exclusions are managed separately below.</p>
                 <textarea rows={8} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y text-slate-700 leading-relaxed" value={tempScopeText} onChange={e => setTempScopeText(e.target.value)} placeholder="Enter the IMS scope..."></textarea>
               </div>
               <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                 <button onClick={() => setIsEditScopeOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                 <button onClick={handleSaveScope} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Document</button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Convert to Risk Modal */}
      <AnimatePresence>
        {isConvertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-800">Send to Risk Register</h3>
                <button 
                  onClick={() => setIsConvertModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Selected Issue:</label>
                  <p className="mt-1 text-slate-800 p-3 bg-slate-50 rounded-lg border border-slate-100 font-medium">
                    "{selectedIssue?.text}"
                  </p>
                </div>
                
                <p className="text-sm text-slate-600">This strategic item will be escalated to the Corporate Strategic Risks & Opportunities Register.</p>
                
                <div className="grid grid-cols-1 mt-4">
                  <RiskRouteButton 
                    title="Strategic Register" 
                    desc="Corporate Risks & Opportunities" 
                    icon={Target} 
                    color="blue" 
                    onClick={handleRiskSelection} 
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components
const RiskRouteButton = ({ title, desc, icon: Icon, color, onClick }: any) => {
  const colorMap: Record<string, string> = {
    blue: "hover:border-blue-300 hover:bg-blue-50 text-blue-600",
    green: "hover:border-green-300 hover:bg-green-50 text-green-600",
    purple: "hover:border-purple-300 hover:bg-purple-50 text-purple-600",
  };

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-xl border border-slate-200 text-left transition-all duration-200 group ${colorMap[color]}`}
    >
      <div className={`p-3 rounded-lg bg-white border border-slate-100 shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-semibold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

const StandardBadge = ({ standard }: { standard: string }) => {
  if (standard.includes('9001')) return <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" title="Quality">ISO 9001</span>;
  if (standard.includes('14001')) return <span className="bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" title="Environment">ISO 14001</span>;
  if (standard.includes('45001')) return <span className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" title="Health & Safety">ISO 45001</span>;
  return null;
};

const IssueCard = ({ issue, convertible = false, onConvert, onDelete, onEdit }: { issue: Issue, convertible?: boolean, onConvert?: () => void, onDelete?: () => void, onEdit?: () => void }) => {
  const getImpactColor = () => {
    const isPositive = issue.category === 'strength' || issue.category === 'opportunity';
    
    switch(issue.impact) {
      case 'high': 
        return isPositive 
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
          : 'bg-red-100 text-red-700 border-red-200';
      case 'medium': 
        return isPositive 
          ? 'bg-blue-100 text-blue-700 border-blue-200' 
          : 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low': 
        return isPositive 
          ? 'bg-slate-100 text-slate-700 border-slate-200' 
          : 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: 
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-3 bg-white border border-slate-100 rounded-lg group hover:border-slate-300 transition-all shadow-sm hover:shadow-md relative">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded flex shadow-sm border border-slate-200">
        {onEdit && (
          <button onClick={onEdit} className="p-1 px-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors border-r border-slate-200" title="Edit Issue">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete Issue">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      <div className="flex justify-between items-start gap-4 pr-6">
        <p className="text-sm text-slate-700 font-medium leading-relaxed">{issue.text}</p>
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <div className="flex gap-1 flex-wrap">
          {issue.standards?.map(s => <StandardBadge key={s} standard={s} />)}
          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ml-1 ${getImpactColor()}`}>
            {issue.impact}
          </span>
        </div>
        
        {convertible && (
          issue.isConverted ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md ml-2 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Evaluated
            </span>
          ) : (
            <button 
              onClick={onConvert}
              className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800 transition-colors bg-blue-50 px-2 py-1 rounded-md ml-2 shrink-0"
            >
              Convert <ArrowRight className="w-3 h-3" />
            </button>
          )
        )}
      </div>
    </div>
  );
};

const PartyRow = ({ 
  party, 
  onDelete, 
  onEdit, 
  isAdmin,
  isFirst,
  rowSpan,
  isLastOfGroup
}: { 
  party: Party, 
  onDelete?: () => void, 
  onEdit?: () => void, 
  isAdmin?: boolean,
  isFirst: boolean,
  rowSpan: number,
  isLastOfGroup: boolean
}) => {
  return (
    <tr className={`hover:bg-slate-50/30 transition-colors group align-top ${
      isLastOfGroup ? 'border-b-2 border-slate-200/60' : ''
    }`}>
      {isFirst && (
        <td 
          className="px-6 py-5 font-semibold text-slate-900 break-words border-r border-slate-100 bg-slate-50/20 align-middle text-center" 
          rowSpan={rowSpan}
        >
          <span className="inline-block px-3 py-1 bg-blue-50/50 text-blue-900 border border-blue-100/50 rounded-lg text-sm font-bold shadow-sm">
            {party.name}
          </span>
        </td>
      )}
      <td className="px-6 py-4">
        <div className="flex gap-1 flex-wrap">
          {party.standards?.map((s: string) => <StandardBadge key={s} standard={s} />)}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600 whitespace-pre-wrap break-words leading-relaxed font-medium">
        {party.needs}
      </td>
      <td className="px-6 py-4">
        <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full shadow-sm border ${
          party.risk === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 
          party.risk === 'Medium' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'
        }`}>
          {party.risk}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600">
         {party.actions && party.actions.length > 0 ? (
            <ul className="list-disc list-inside space-y-1.5 marker:text-slate-400">
               {party.actions.map((act, i) => (
                  <li key={i} className="leading-relaxed whitespace-pre-wrap break-words">{act}</li>
               ))}
            </ul>
         ) : (
           <span className="text-slate-400 italic">No mitigations specified</span>
         )}
      </td>
      <td className="px-6 py-4">
        {party.responsible ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            {party.responsible}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">-</span>
        )}
      </td>
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 shadow-sm hover:shadow" title="Edit Party">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shadow-sm hover:shadow" title="Delete Party">
                 <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
};
