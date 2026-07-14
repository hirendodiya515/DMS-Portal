import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, FileText, Plus, AlertTriangle, CheckCircle2, X, Trash2, History, Clock, FileCheck, MessageSquare, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

/* --- Data Interfaces --- */
interface Issue {
  id: string;
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
  text: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  standards: string[];
  isConverted?: boolean;
  createdAt?: string;
  pestleCategory?: 'Political' | 'Economic' | 'Social' | 'Technological' | 'Legal' | 'Environmental' | 'NA';
  imsStatus?: 'Identified' | 'Under Review' | 'Monitoring' | 'Reviewed';
  evaluation?: 'Monitor Only' | 'Escalate to Risk Register' | 'Escalate to Opportunity Register' | 'Management Review Input' | 'Strategic Objective' | 'Management of Change' | 'No Further Action';
  trend?: 'Increasing' | 'Stable' | 'Reducing' | 'Resolved';
  lastReviewDate?: string;
  frequency?: 'quarterly' | 'half yearly' | 'yearly' | 'when required';
  linkedRiskId?: string | null;
  linkedMocRecordId?: string | null;
  linkedMocDocumentId?: string | null;
  linkedMocType?: 'workflow' | 'document' | 'none';
  linkedMocNumber?: string | null;
  linkedMocTitle?: string | null;
}

interface Party {
  id: string;
  name: string;
  standards: string[];
  needs: string;
  risk: 'Low' | 'Medium' | 'High';
  actions: string[];
  responsible?: string;
  category: 'Internal' | 'External';
  complianceObligations?: string;
  associatedRisks?: string;
  associatedOpportunities?: string;
}

export default function ContextOfOrgPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('swot');
  
  interface HistoryLog {
    id: string;
    tab: 'swot' | 'party' | 'scope' | 'general';
    action: 'add' | 'edit' | 'delete' | 'review';
    itemName?: string;
    details: string;
    timestamp: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  }

  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState("");

  const [mocRecords, setMocRecords] = useState<any[]>([]);
  const [mocDocuments, setMocDocuments] = useState<any[]>([]);
  const [isMocModalOpen, setIsMocModalOpen] = useState(false);
  const [selectedIssueForMoc, setSelectedIssueForMoc] = useState<Issue | null>(null);
  const [mocModalTab, setMocModalTab] = useState<'workflow' | 'document'>('workflow');
  const [mocSearchQuery, setMocSearchQuery] = useState('');



  // --- Dynamic State ---
  const [issues, setIssues] = useState<Issue[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [scopeText, setScopeText] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [issuesSearchTerm, setIssuesSearchTerm] = useState("");
  const [swotViewMode, setSwotViewMode] = useState<'table' | 'matrix'>('table');
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedSwotCategory, setSelectedSwotCategory] = useState<string>('all');
  const [selectedPestleCategory, setSelectedPestleCategory] = useState<string>('all');
  const [swotSortField, setSwotSortField] = useState<string>('displayId');
  const [swotSortDirection, setSwotSortDirection] = useState<'asc' | 'desc'>('asc');

  const [showAnalytics, setShowAnalytics] = useState(false);

  const swotCategoryData = React.useMemo(() => {
    const counts = { strength: 0, weakness: 0, opportunity: 0, threat: 0 };
    issues.forEach(i => {
      if (counts[i.category] !== undefined) {
        counts[i.category]++;
      }
    });
    return [
      { name: 'Strengths', count: counts.strength, color: '#10b981' },
      { name: 'Weaknesses', count: counts.weakness, color: '#f43f5e' },
      { name: 'Opportunities', count: counts.opportunity, color: '#3b82f6' },
      { name: 'Threats', count: counts.threat, color: '#f59e0b' }
    ];
  }, [issues]);

  const pestleCategoryData = React.useMemo(() => {
    const counts: Record<string, number> = {
      Political: 0,
      Economic: 0,
      Social: 0,
      Technological: 0,
      Legal: 0,
      Environmental: 0
    };
    issues.forEach(i => {
      if (i.pestleCategory && counts[i.pestleCategory] !== undefined) {
        counts[i.pestleCategory]++;
      }
    });
    return Object.keys(counts).map(key => ({
      name: key,
      count: counts[key]
    }));
  }, [issues]);

  const handleSwotSort = (field: string) => {
    if (swotSortField === field) {
      setSwotSortDirection(swotSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSwotSortField(field);
      setSwotSortDirection('asc');
    }
  };

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/org-context/history');
      setHistoryLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch org context history:', error);
    }
  };

  const handleLogReview = async () => {
    if (!reviewComment.trim()) return;
    try {
      await api.post('/org-context/review', { details: reviewComment.trim() });
      setReviewComment("");
      setIsReviewModalOpen(false);
      fetchHistory();
    } catch (error) {
      console.error('Failed to log review:', error);
      alert('Failed to log review. Please try again.');
    }
  };

  const fetchData = async () => {
    try {
      const [issuesRes, partiesRes, scopeRes, deptsRes, historyRes] = await Promise.all([
        api.get('/org-context/issues'),
        api.get('/org-context/parties'),
        api.get('/org-context/scope'),
        api.get('/settings/departments').catch(() => ({ data: [] })),
        api.get('/org-context/history').catch(() => ({ data: [] }))
      ]);
      setIssues(issuesRes.data);
      setParties(partiesRes.data);
      setDepartments(deptsRes.data || []);
      setHistoryLogs(historyRes.data || []);
      
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

  const [newIssue, setNewIssue] = useState<Partial<Issue>>({
    category: 'strength',
    impact: 'low',
    standards: ['ISO 9001'],
    pestleCategory: 'NA',
    imsStatus: 'Identified',
    evaluation: 'Monitor Only',
    trend: 'Stable',
    lastReviewDate: '',
    frequency: 'when required'
  });
  const [newParty, setNewParty] = useState<Partial<Party>>({ risk: 'Medium', standards: ['ISO 9001'], actions: [], category: 'Internal' });
  const [tempAction, setTempAction] = useState("");
  const [tempScopeText, setTempScopeText] = useState(scopeText);

  // Editing State
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);

  // Handlers

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
      setNewIssue({
        category: 'strength',
        impact: 'low',
        standards: ['ISO 9001'],
        pestleCategory: 'NA',
        imsStatus: 'Identified',
        evaluation: 'Monitor Only',
        trend: 'Stable',
        lastReviewDate: '',
        frequency: 'when required'
      });
      setEditingIssueId(null);
      fetchHistory();
    } catch (error) {
      console.error('Failed to save issue:', error);
      alert('Failed to save issue. Please try again.');
    }
  };

  const handleUpdateIssueField = async (issueId: string, field: keyof Issue, value: any) => {
    try {
      const issue = issues.find(i => i.id === issueId);
      if (!issue) return;
      const updatedIssue = { ...issue, [field]: value };
      
      if (field === 'evaluation' && (value === 'Escalate to Risk Register' || value === 'Escalate to Opportunity Register')) {
        updatedIssue.isConverted = true;
        await api.put(`/org-context/issues/${issueId}`, updatedIssue);
        setIssues(issues.map(i => i.id === issueId ? updatedIssue : i));
        fetchHistory();
        
        navigate('/risks/strategic', {
          state: {
            swotIssueId: issueId,
            text: updatedIssue.text,
            standards: updatedIssue.standards,
            type: value === 'Escalate to Risk Register' ? 'Risk' : 'Opportunity'
          }
        });
        return;
      }

      await api.put(`/org-context/issues/${issueId}`, updatedIssue);
      setIssues(issues.map(i => i.id === issueId ? updatedIssue : i));
      fetchHistory();
    } catch (error) {
      console.error('Failed to update issue field:', error);
      alert('Failed to update. Please try again.');
    }
  };

  const fetchMocsAndDocs = async () => {
    try {
      const [mocRes, docRes] = await Promise.all([
        api.get('/moc').catch(() => ({ data: [] })),
        api.get('/documents').catch(() => ({ data: [] }))
      ]);
      setMocRecords(mocRes.data || []);
      const allDocs = docRes.data || [];
      const filteredDocs = allDocs.filter((d: any) => 
        d.type?.toLowerCase() === 'moc' || 
        d.title?.toLowerCase().includes('moc') || 
        d.documentNumber?.toLowerCase().includes('moc')
      );
      setMocDocuments(filteredDocs);
    } catch (e) {
      console.error('Failed to fetch MOC data:', e);
    }
  };

  const openMocLinkModal = (issue: Issue) => {
    setSelectedIssueForMoc(issue);
    setMocSearchQuery('');
    setMocModalTab('workflow');
    setIsMocModalOpen(true);
    fetchMocsAndDocs();
  };

  const handleLinkMocItem = async (mocItem: any, type: 'workflow' | 'document') => {
    if (!selectedIssueForMoc) return;
    
    try {
      const updatedFields: any = {
        linkedMocType: type,
        linkedMocRecordId: type === 'workflow' ? mocItem.id : null,
        linkedMocDocumentId: type === 'document' ? mocItem.id : null,
        linkedMocNumber: type === 'workflow' ? mocItem.mocNo : null,
        linkedMocTitle: type === 'document' ? mocItem.title : null
      };

      await api.put(`/org-context/issues/${selectedIssueForMoc.id}`, updatedFields);
      setIssues(issues.map(i => i.id === selectedIssueForMoc.id ? { ...i, ...updatedFields } : i));
      setIsMocModalOpen(false);
      setSelectedIssueForMoc(null);
      fetchHistory();
    } catch (error) {
      console.error('Failed to link MOC item:', error);
      alert('Failed to link. Please try again.');
    }
  };

  const handleUnlinkMoc = async (issueId: string) => {
    try {
      const updatedFields: Partial<Issue> = {
        linkedMocType: 'none',
        linkedMocRecordId: null,
        linkedMocDocumentId: null,
        linkedMocNumber: null,
        linkedMocTitle: null
      };
      await api.put(`/org-context/issues/${issueId}`, updatedFields);
      setIssues(issues.map(i => i.id === issueId ? { ...i, ...updatedFields } : i));
      fetchHistory();
    } catch (error) {
      console.error('Failed to unlink MOC:', error);
      alert('Failed to unlink. Please try again.');
    }
  };

  const [isRecommending, setIsRecommending] = useState(false);

  const handleAiRecommendSwotPestle = async () => {
    if (!newIssue.text?.trim()) return;
    setIsRecommending(true);
    try {
      const response = await api.post('/ai/recommend-swot-pestle', { text: newIssue.text });
      const recommendation = response.data;
      if (recommendation) {
        setNewIssue(prev => ({
          ...prev,
          category: recommendation.category || prev.category,
          pestleCategory: recommendation.pestleCategory || prev.pestleCategory,
          impact: recommendation.impact || prev.impact,
          standards: recommendation.standards || prev.standards
        }));
      }
    } catch (error) {
      console.error('AI Recommendation failed:', error);
      alert('Failed to get recommendation from AI. Make sure Ollama is running locally.');
    } finally {
      setIsRecommending(false);
    }
  };

  const openEditIssueModal = (issue: Issue) => {
    setNewIssue({
      ...issue,
      lastReviewDate: issue.lastReviewDate ? issue.lastReviewDate.split('T')[0] : ''
    });
    setEditingIssueId(issue.id);
    setIsAddIssueOpen(true);
  };

  const handleDeleteIssue = async (id: string) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;
    try {
      await api.delete(`/org-context/issues/${id}`);
      setIssues(issues.filter(i => i.id !== id));
      fetchHistory();
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
      setNewParty({ risk: 'Medium', standards: ['ISO 9001'], actions: [], category: 'Internal' });
      setTempAction("");
      setEditingPartyId(null);
      fetchHistory();
    } catch (error) {
      console.error('Failed to save party:', error);
      alert('Failed to save Interested Party. Please try again.');
    }
  };

  const openEditPartyModal = (party: Party) => {
    setNewParty({ ...party, category: party.category || 'Internal' });
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
      fetchHistory();
    } catch (error) {
      console.error('Failed to delete interested party:', error);
      alert('Failed to delete interested party. Please try again.');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/org-context/parties/export', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `interested-parties-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  const handleExportIssuesExcel = async () => {
    try {
      const response = await api.get('/org-context/issues/export', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `swot-issues-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export SWOT issues to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  const handleSaveScope = async () => {
    try {
      await api.post('/org-context/scope', { content: tempScopeText });
      setScopeText(tempScopeText);
      setIsEditScopeOpen(false);
      fetchHistory();
    } catch (error) {
      console.error('Failed to save scope:', error);
      alert('Failed to save IMS scope. Please try again.');
    }
  };

  const tabs = [
    { id: 'swot', label: 'Internal & External Issues', icon: LayoutDashboard },
    { id: 'stakeholders', label: 'Interested Parties', icon: Users },
    { id: 'scope', label: 'IMS Scope', icon: FileText },
    { id: 'history', label: 'Revision History', icon: History },
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
              // 1. Map stable IDs oldest-to-newest based on all issues
              const issuesWithStableIds = [...issues].reverse().map((issue, idx) => ({
                ...issue,
                displayId: `ISS-${String(idx + 1).padStart(2, '0')}`
              })).reverse();

              // 2. Filter issues
              const filteredIssues = issuesWithStableIds.filter(i => {
                // Text Search Filter
                const term = issuesSearchTerm.toLowerCase();
                const matchesText = 
                  i.text.toLowerCase().includes(term) ||
                  i.category.toLowerCase().includes(term) ||
                  i.impact.toLowerCase().includes(term) ||
                  i.standards.some(std => std.toLowerCase().includes(term));

                // ISO Standard Filter
                const matchesStandard = 
                  selectedStandard === "all" ||
                  i.standards.includes(selectedStandard);

                // State Filter
                const matchesState = 
                  selectedState === "all" ||
                  (selectedState === "evaluated" && i.isConverted) ||
                  (selectedState === "draft" && !i.isConverted);

                // SWOT Category Filter
                const matchesSwot =
                  selectedSwotCategory === "all" ||
                  i.category === selectedSwotCategory;

                // PESTLE Category Filter
                const matchesPestle =
                  selectedPestleCategory === "all" ||
                  i.pestleCategory === selectedPestleCategory;

                return matchesText && matchesStandard && matchesState && matchesSwot && matchesPestle;
              });

              // 3. Sort issues for Tabular View
              const sortedIssues = [...filteredIssues].sort((a, b) => {
                let valA: any = '';
                let valB: any = '';

                switch (swotSortField) {
                  case 'displayId':
                    valA = a.displayId;
                    valB = b.displayId;
                    break;
                  case 'category':
                    valA = a.category;
                    valB = b.category;
                    break;
                  case 'text':
                    valA = a.text;
                    valB = b.text;
                    break;
                  case 'standards':
                    valA = a.standards.join(', ');
                    valB = b.standards.join(', ');
                    break;
                  case 'impact':
                    const impactWeight = { low: 1, medium: 2, high: 3, critical: 4 };
                    valA = impactWeight[a.impact] || 0;
                    valB = impactWeight[b.impact] || 0;
                    break;
                  case 'pestleCategory':
                    valA = a.pestleCategory || 'NA';
                    valB = b.pestleCategory || 'NA';
                    break;
                  case 'imsStatus':
                    valA = a.imsStatus || 'Identified';
                    valB = b.imsStatus || 'Identified';
                    break;
                  case 'evaluation':
                    valA = a.evaluation || 'Monitor Only';
                    valB = b.evaluation || 'Monitor Only';
                    break;
                  case 'trend':
                    valA = a.trend || 'Stable';
                    valB = b.trend || 'Stable';
                    break;
                  case 'isConverted':
                    valA = a.isConverted ? 1 : 0;
                    valB = b.isConverted ? 1 : 0;
                    break;
                  default:
                    valA = a.createdAt;
                    valB = b.createdAt;
                }

                if (valA < valB) return swotSortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return swotSortDirection === 'asc' ? 1 : -1;
                return 0;
              });

              const renderSortIndicator = (field: string) => {
                if (swotSortField !== field) {
                  return <span className="text-slate-300 ml-1 group-hover/th:opacity-100 opacity-0 transition-opacity">↕</span>;
                }
                return swotSortDirection === 'asc' 
                  ? <span className="text-blue-600 ml-1">▲</span> 
                  : <span className="text-blue-600 ml-1">▼</span>;
              };

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
                      {/* Show/Hide Analytics Toggle */}
                      <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                          showAnalytics 
                            ? 'bg-blue-50 text-blue-600 border-blue-200' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                        {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                      </button>

                      <button
                        onClick={handleExportIssuesExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        Export to Excel
                      </button>

                      {/* View Selector Switch */}
                      <div className="flex items-center bg-slate-200/60 p-1 rounded-lg border border-slate-300 shadow-sm shrink-0">
                        <button 
                          onClick={() => setSwotViewMode('table')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            swotViewMode === 'table' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Tabular View
                        </button>
                        <button 
                          onClick={() => setSwotViewMode('matrix')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            swotViewMode === 'matrix' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                          Matrix View
                        </button>
                      </div>

                      {isAdmin && (
                        <button onClick={() => {
                          setEditingIssueId(null);
                          setNewIssue({
                            category: 'strength',
                            impact: 'low',
                            standards: ['ISO 9001'],
                            pestleCategory: 'NA',
                            imsStatus: 'Identified',
                            evaluation: 'Monitor Only',
                            trend: 'Stable',
                            lastReviewDate: '',
                            frequency: 'when required'
                          });
                          setIsAddIssueOpen(true);
                        }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm shrink-0">
                          <Plus className="w-4 h-4" />
                          Add Issue
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Analytics Section */}
                  <AnimatePresence>
                    {showAnalytics && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm"
                      >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Chart 1: SWOT Distribution */}
                          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-lg flex flex-col h-[280px]">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-left">SWOT Category Distribution</h4>
                            <div className="flex-1 min-h-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={swotCategoryData} margin={{ left: -20, right: 10, top: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500, fill: '#64748b' }} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                  <RechartsTooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {swotCategoryData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Chart 2: PESTLE Profile */}
                          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-lg flex flex-col h-[280px]">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-left">PESTLE Distribution (External Issues)</h4>
                            <div className="flex-1 min-h-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pestleCategoryData} margin={{ left: -20, right: 10, top: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 500, fill: '#64748b' }} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                  <RechartsTooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Search and Filters Bar */}
                  <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </span>
                      <input 
                        type="text"
                        placeholder="Search issues, standard IDs, keywords..."
                        value={issuesSearchTerm}
                        onChange={e => setIssuesSearchTerm(e.target.value)}
                        className="pl-9 pr-8 py-2 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                      {issuesSearchTerm && (
                        <button onClick={() => setIssuesSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto shrink-0 flex-wrap">
                      <select 
                        value={selectedStandard}
                        onChange={e => setSelectedStandard(e.target.value)}
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 w-full md:w-auto"
                      >
                        <option value="all">All ISO Standards</option>
                        <option value="ISO 9001">ISO 9001</option>
                        <option value="ISO 14001">ISO 14001</option>
                        <option value="ISO 45001">ISO 45001</option>
                      </select>

                      <select 
                        value={selectedState}
                        onChange={e => setSelectedState(e.target.value)}
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 w-full md:w-auto"
                      >
                        <option value="all">All States</option>
                        <option value="evaluated">Evaluated (Escalated)</option>
                        <option value="draft">Draft (Pending Action)</option>
                      </select>

                      <select 
                        value={selectedSwotCategory}
                        onChange={e => setSelectedSwotCategory(e.target.value)}
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 w-full md:w-auto"
                      >
                        <option value="all">All SWOT Categories</option>
                        <option value="strength">Strength (Internal)</option>
                        <option value="weakness">Weakness (Internal)</option>
                        <option value="opportunity">Opportunity (External)</option>
                        <option value="threat">Threat (External)</option>
                      </select>

                      <select 
                        value={selectedPestleCategory}
                        onChange={e => setSelectedPestleCategory(e.target.value)}
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 w-full md:w-auto"
                      >
                        <option value="all">All PESTLE Categories</option>
                        <option value="Political">Political</option>
                        <option value="Economic">Economic</option>
                        <option value="Social">Social</option>
                        <option value="Technological">Technological</option>
                        <option value="Legal">Legal</option>
                        <option value="Environmental">Environmental</option>
                        <option value="NA">NA</option>
                      </select>
                    </div>
                  </div>

                  {swotViewMode === 'table' ? (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1900px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs tracking-wider uppercase font-bold select-none">
                              <th onClick={() => handleSwotSort('displayId')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  ID {renderSortIndicator('displayId')}
                                </div>
                              </th>
                              <th onClick={() => handleSwotSort('category')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  CATEGORY / MATRIX {renderSortIndicator('category')}
                                </div>
                              </th>
                              <th onClick={() => handleSwotSort('pestleCategory')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  PESTLE CATEGORY {renderSortIndicator('pestleCategory')}
                                </div>
                              </th>
                              <th onClick={() => handleSwotSort('text')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  ISSUE DESCRIPTION {renderSortIndicator('text')}
                                </div>
                              </th>
                              <th onClick={() => handleSwotSort('standards')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  APPLICABLE STANDARDS {renderSortIndicator('standards')}
                                </div>
                              </th>
                              <th onClick={() => handleSwotSort('impact')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  GENERAL IMPACT {renderSortIndicator('impact')}
                                </div>
                              </th>
                              <th onClick={() => handleSwotSort('imsStatus')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  REVIEW STATUS {renderSortIndicator('imsStatus')}
                                </div>
                              </th>
                              <th onClick={() => handleSwotSort('trend')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  TREND {renderSortIndicator('trend')}
                                </div>
                              </th>
                              <th onClick={() => handleSwotSort('evaluation')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors group/th">
                                <div className="flex items-center gap-1">
                                  EVALUATION DECISION {renderSortIndicator('evaluation')}
                                </div>
                              </th>
                              <th className="px-6 py-4">LAST REVIEW DATE</th>
                              <th className="px-6 py-4">FREQUENCY</th>
                              <th className="px-6 py-4 text-left">NEXT REVIEW DATE</th>
                              <th className="px-6 py-4 text-right">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sortedIssues.map((issue) => (
                              <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors align-middle">
                                <td className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">
                                  {issue.displayId}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-800 uppercase whitespace-nowrap">
                                  {issue.category}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {(issue.category === 'strength' || issue.category === 'weakness') ? (
                                    <span className="text-slate-400 text-xs font-semibold italic">NA</span>
                                  ) : (
                                    isAdmin ? (
                                      <select
                                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={issue.pestleCategory || 'NA'}
                                        onChange={e => handleUpdateIssueField(issue.id, 'pestleCategory', e.target.value as any)}
                                      >
                                        <option value="NA">NA</option>
                                        <option value="Political">Political</option>
                                        <option value="Economic">Economic</option>
                                        <option value="Social">Social</option>
                                        <option value="Technological">Technological</option>
                                        <option value="Legal">Legal</option>
                                        <option value="Environmental">Environmental</option>
                                      </select>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                        {issue.pestleCategory || 'NA'}
                                      </span>
                                    )
                                  )}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700 leading-relaxed font-medium min-w-[320px] max-w-[500px] break-words whitespace-normal">
                                  {issue.text}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex gap-1 flex-wrap">
                                    {issue.standards?.map(std => <StandardBadge key={std} standard={std} />)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-700 uppercase whitespace-nowrap">
                                  {issue.impact}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isAdmin ? (
                                    <select
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      value={issue.imsStatus || 'Identified'}
                                      onChange={e => handleUpdateIssueField(issue.id, 'imsStatus', e.target.value as any)}
                                    >
                                      <option value="Identified">Identified</option>
                                      <option value="Under Review">Under Review</option>
                                      <option value="Monitoring">Monitoring</option>
                                      <option value="Reviewed">Reviewed</option>
                                    </select>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {issue.imsStatus || 'Identified'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isAdmin ? (
                                    <select
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      value={issue.trend || 'Stable'}
                                      onChange={e => handleUpdateIssueField(issue.id, 'trend', e.target.value as any)}
                                    >
                                      <option value="Increasing">Increasing</option>
                                      <option value="Stable">Stable</option>
                                      <option value="Reducing">Reducing</option>
                                      <option value="Resolved">Resolved</option>
                                    </select>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                      {issue.trend || 'Stable'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    {isAdmin && !(issue.isConverted && issue.linkedRiskId) ? (
                                      <select
                                        className="bg-indigo-50 border border-indigo-200 rounded px-2 py-1 text-xs font-semibold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={issue.evaluation || 'Monitor Only'}
                                        onChange={e => handleUpdateIssueField(issue.id, 'evaluation', e.target.value as any)}
                                      >
                                        <option value="Monitor Only">Monitor Only</option>
                                        <option value="Escalate to Risk Register">Escalate to Risk Register</option>
                                        <option value="Escalate to Opportunity Register">Escalate to Opportunity Register</option>
                                        <option value="Management Review Input">Management Review Input</option>
                                        <option value="Strategic Objective">Strategic Objective</option>
                                        <option value="Management of Change">Management of Change</option>
                                        <option value="No Further Action">No Further Action</option>
                                      </select>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {(issue.isConverted && issue.linkedRiskId) ? `Linked (${issue.evaluation === 'Escalate to Risk Register' ? 'Risk' : 'Opportunity'})` : (issue.evaluation || 'Monitor Only')}
                                      </span>
                                    )}

                                    {issue.evaluation === 'Management of Change' && (
                                      <div className="flex items-center gap-1 mt-1">
                                        {issue.linkedMocType && issue.linkedMocType !== 'none' ? (
                                          <>
                                            <button
                                              onClick={() => navigate(issue.linkedMocType === 'workflow' ? '/moc' : `/documents/${issue.linkedMocDocumentId}`)}
                                              className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                                            >
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                              {issue.linkedMocType === 'workflow' ? `${issue.linkedMocNumber || 'Workflow'}` : `Doc: ${issue.linkedMocTitle || 'File'}`}
                                            </button>
                                            {isAdmin && (
                                              <button
                                                onClick={() => handleUnlinkMoc(issue.id)}
                                                className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                                                title="Remove Link"
                                              >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          isAdmin && (
                                            <button
                                              onClick={() => openMocLinkModal(issue)}
                                              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                                            >
                                              <Plus className="w-3 h-3" /> Link MOC
                                            </button>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isAdmin ? (
                                    <input
                                      type="date"
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      value={issue.lastReviewDate ? issue.lastReviewDate.split('T')[0] : ''}
                                      onChange={e => handleUpdateIssueField(issue.id, 'lastReviewDate', e.target.value)}
                                    />
                                  ) : (
                                    <span className="text-sm font-medium text-slate-700">
                                      {issue.lastReviewDate ? new Date(issue.lastReviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isAdmin ? (
                                    <select
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      value={issue.frequency || 'when required'}
                                      onChange={e => handleUpdateIssueField(issue.id, 'frequency', e.target.value as any)}
                                    >
                                      <option value="quarterly">Quarterly</option>
                                      <option value="half yearly">Half Yearly</option>
                                      <option value="yearly">Yearly</option>
                                      <option value="when required">When Required</option>
                                    </select>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                                      {issue.frequency || 'when required'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                                  {calculateNextReviewDate(issue.lastReviewDate, issue.frequency)}
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-2">
                                    {isAdmin && (
                                      <div className="flex gap-1 border-l border-slate-200 pl-2">
                                        <button 
                                          onClick={() => openEditIssueModal(issue)}
                                          className="p-1 px-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors rounded-md" 
                                          title="Edit Issue"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteIssue(issue.id)}
                                          className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-md" 
                                          title="Delete Issue"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {sortedIssues.length === 0 && (
                              <tr>
                                <td colSpan={13} className="px-6 py-8 text-center text-slate-500 text-sm">
                                  No internal & external issues found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="relative bg-slate-100/50 p-6 rounded-2xl border border-slate-200/80 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[700px]">
                      {/* Center SWOT Axis intersection badge */}
                      <div className="hidden md:flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white border-4 border-slate-200 rounded-full shadow-md items-center justify-center z-10 select-none">
                        <span className="text-xs font-black bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">SWOT</span>
                      </div>

                      {/* Strengths Quadrant */}
                      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                        <div className="bg-emerald-50/70 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">S</span>
                            <span className="font-bold text-emerald-800 text-sm">Strengths (Helpful / Internal)</span>
                          </div>
                          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">{filteredIssues.filter(i => i.category === 'strength').length} items</span>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar bg-emerald-50/10 text-left">
                          {filteredIssues.filter(i => i.category === 'strength').map(issue => (
                            <IssueCard key={issue.id} issue={issue} onDelete={isAdmin ? () => handleDeleteIssue(issue.id) : undefined} onEdit={isAdmin ? () => openEditIssueModal(issue) : undefined} onUpdateField={(field, val) => handleUpdateIssueField(issue.id, field, val)} onLinkMoc={() => openMocLinkModal(issue)} onUnlinkMoc={() => handleUnlinkMoc(issue.id)} />
                          ))}
                          {filteredIssues.filter(i => i.category === 'strength').length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-8">No internal strengths recorded.</p>
                          )}
                        </div>
                      </div>

                      {/* Weaknesses Quadrant */}
                      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                        <div className="bg-rose-50/70 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">W</span>
                            <span className="font-bold text-rose-800 text-sm">Weaknesses (Harmful / Internal)</span>
                          </div>
                          <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-bold">{filteredIssues.filter(i => i.category === 'weakness').length} items</span>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar bg-rose-50/10 text-left">
                          {filteredIssues.filter(i => i.category === 'weakness').map(issue => (
                             <IssueCard key={issue.id} issue={issue} onDelete={isAdmin ? () => handleDeleteIssue(issue.id) : undefined} onEdit={isAdmin ? () => openEditIssueModal(issue) : undefined} onUpdateField={(field, val) => handleUpdateIssueField(issue.id, field, val)} onLinkMoc={() => openMocLinkModal(issue)} onUnlinkMoc={() => handleUnlinkMoc(issue.id)} />
                          ))}
                          {filteredIssues.filter(i => i.category === 'weakness').length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-8">No internal weaknesses recorded.</p>
                          )}
                        </div>
                      </div>

                      {/* Opportunities Quadrant */}
                      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                        <div className="bg-blue-50/70 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">O</span>
                            <span className="font-bold text-blue-800 text-sm">Opportunities (Helpful / External)</span>
                          </div>
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{filteredIssues.filter(i => i.category === 'opportunity').length} items</span>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar bg-blue-50/10 text-left">
                           {filteredIssues.filter(i => i.category === 'opportunity').map(issue => (
                             <IssueCard key={issue.id} issue={issue} onDelete={isAdmin ? () => handleDeleteIssue(issue.id) : undefined} onEdit={isAdmin ? () => openEditIssueModal(issue) : undefined} onUpdateField={(field, val) => handleUpdateIssueField(issue.id, field, val)} onLinkMoc={() => openMocLinkModal(issue)} onUnlinkMoc={() => handleUnlinkMoc(issue.id)} />
                          ))}
                           {filteredIssues.filter(i => i.category === 'opportunity').length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-8">No external opportunities recorded.</p>
                          )}
                        </div>
                      </div>

                      {/* Threats Quadrant */}
                      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                        <div className="bg-amber-50/70 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">T</span>
                            <span className="font-bold text-amber-800 text-sm">Threats (Harmful / External)</span>
                          </div>
                          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">{filteredIssues.filter(i => i.category === 'threat').length} items</span>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar bg-amber-50/10 text-left">
                          {filteredIssues.filter(i => i.category === 'threat').map(issue => (
                             <IssueCard key={issue.id} issue={issue} onDelete={isAdmin ? () => handleDeleteIssue(issue.id) : undefined} onEdit={isAdmin ? () => openEditIssueModal(issue) : undefined} onUpdateField={(field, val) => handleUpdateIssueField(issue.id, field, val)} onLinkMoc={() => openMocLinkModal(issue)} onUnlinkMoc={() => handleUnlinkMoc(issue.id)} />
                          ))}
                          {filteredIssues.filter(i => i.category === 'threat').length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-8">No external threats recorded.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                      <div className="flex gap-3">
                        <button 
                          onClick={handleExportExcel} 
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium shadow-sm shrink-0 border border-slate-200"
                        >
                          <Download className="w-4 h-4 text-slate-500" />
                          Export to Excel
                        </button>
                        {isAdmin && (
                          <button onClick={() => { setEditingPartyId(null); setNewParty({ risk: 'Medium', standards: ['ISO 9001'], actions: [], category: 'Internal' }); setIsAddPartyOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm shrink-0">
                            <Plus className="w-4 h-4" />
                            Add Party
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1800px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                            <th className="px-6 py-4 font-medium">Interested Party</th>
                            <th className="px-6 py-4 font-medium">Category</th>
                            <th className="px-6 py-4 font-medium">Standards</th>
                            <th className="px-6 py-4 font-medium">Needs & Expectations</th>
                            <th className="px-6 py-4 font-medium">Statutory/Compliance Obligations</th>
                            <th className="px-6 py-4 font-medium">Associated Risks</th>
                            <th className="px-6 py-4 font-medium">Associated Opportunities</th>
                            <th className="px-6 py-4 font-medium">Risk if Unmet</th>
                            <th className="px-6 py-4 font-medium">Mitigations / Actions</th>
                            <th className="px-6 py-4 font-medium">Responsible</th>
                            {isAdmin && <th className="px-6 py-4 font-medium text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupedPartiesList.map((group, groupIdx) => {
                            const isEvenGroup = groupIdx % 2 === 0;
                            return group.items.map((party, index) => (
                              <PartyRow 
                                key={party.id}
                                party={party}
                                isFirst={index === 0}
                                rowSpan={group.items.length}
                                isLastOfGroup={index === group.items.length - 1}
                                isEvenGroup={isEvenGroup}
                                onDelete={isAdmin ? () => handleDeleteParty(party.id) : undefined}
                                onEdit={isAdmin ? () => openEditPartyModal(party) : undefined}
                                isAdmin={isAdmin}
                              />
                            ));
                          })}
                          {groupedPartiesList.length === 0 && (
                             <tr>
                               <td colSpan={isAdmin ? 11 : 10} className="px-6 py-8 text-center text-slate-500 text-sm">
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

            {activeTab === 'history' && (() => {
              const lastReview = historyLogs.find(log => log.action === 'review');
              const lastUpdate = historyLogs[0];

              return (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800 font-sans">Revision & Review History<p className="text-xs text-slate-500 mt-1 font-sans">Audit log of all changes and management reviews</p></h2>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => { setReviewComment(""); setIsReviewModalOpen(true); }} 
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm shrink-0"
                      >
                        <FileCheck className="w-4 h-4" />
                        Log Manual Review
                      </button>
                    )}
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase block font-sans">Last Management Review</span>
                        <span className="text-sm font-bold text-slate-800 block mt-1 font-sans">
                          {lastReview ? new Date(lastReview.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No reviews logged yet'}
                        </span>
                        {lastReview && (
                          <span className="text-xs text-slate-500 mt-0.5 block truncate max-w-[200px]" title={lastReview.user ? `${lastReview.user.firstName} ${lastReview.user.lastName}` : 'System'}>
                            by {lastReview.user ? `${lastReview.user.firstName} ${lastReview.user.lastName}` : 'System'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase block font-sans">Last Updated Date</span>
                        <span className="text-sm font-bold text-slate-800 block mt-1 font-sans">
                          {lastUpdate ? new Date(lastUpdate.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No updates logged yet'}
                        </span>
                        {lastUpdate && (
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            by {lastUpdate.user ? `${lastUpdate.user.firstName} ${lastUpdate.user.lastName}` : 'System'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg">
                        <History className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase block font-sans">Total Operations Logged</span>
                        <span className="text-2xl font-bold text-indigo-700 block mt-0.5 font-sans">
                          {historyLogs.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    {historyLogs.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">No change history logs available.</p>
                    ) : (
                      <div className="relative border-l border-slate-200 pl-8 ml-4 space-y-8">
                        {historyLogs.map(log => {
                          const isReview = log.action === 'review';
                          const isAdd = log.action === 'add';
                          const isDelete = log.action === 'delete';

                          const getActionBadge = () => {
                            if (isReview) return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full font-sans">Reviewed</span>;
                            if (isAdd) return <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full font-sans">Added</span>;
                            if (isDelete) return <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full font-sans">Deleted</span>;
                            return <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full font-sans">Updated</span>;
                          };

                          const getTabBadge = () => {
                            if (log.tab === 'swot') return <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-sans">SWOT</span>;
                            if (log.tab === 'party') return <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-sans">Interested Parties</span>;
                            if (log.tab === 'scope') return <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-sans">IMS Scope</span>;
                            return null;
                          };

                          const getIcon = () => {
                            if (isReview) return <FileCheck className="w-4 h-4 text-emerald-600" />;
                            if (log.tab === 'swot') return <LayoutDashboard className="w-4 h-4 text-slate-600" />;
                            if (log.tab === 'party') return <Users className="w-4 h-4 text-slate-600" />;
                            if (log.tab === 'scope') return <FileText className="w-4 h-4 text-slate-600" />;
                            return <Clock className="w-4 h-4 text-slate-600" />;
                          };

                          const getIconBg = () => {
                            if (isReview) return 'bg-emerald-50 border-emerald-200';
                            if (isAdd) return 'bg-green-50 border-green-200';
                            if (isDelete) return 'bg-red-50 border-red-200';
                            return 'bg-slate-50 border-slate-200';
                          };

                          return (
                            <div key={log.id} className="relative">
                              {/* Timeline dot/icon */}
                              <div className={`absolute -left-[49px] top-0.5 w-8 h-8 rounded-full border flex items-center justify-center bg-white shadow-sm ${getIconBg()}`}>
                                {getIcon()}
                              </div>

                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="font-semibold text-slate-800 text-sm font-sans">
                                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                                    </span>
                                    {getActionBadge()}
                                    {getTabBadge()}
                                  </div>
                                  <p className="text-sm text-slate-600 font-medium font-sans leading-relaxed">{log.details}</p>
                                  {isReview && log.itemName && (
                                    <div className="flex items-start gap-1.5 bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs text-slate-600 mt-2 max-w-xl font-sans leading-relaxed">
                                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                      <span>{log.itemName}</span>
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 shrink-0 font-medium font-sans">
                                  {new Date(log.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>

      {/* MODALS */}
      {/* Log Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-800 font-sans">Log Management Review</h3>
                <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 font-sans">Review Comments / Details</label>
                  <textarea 
                    rows={4} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 leading-relaxed text-sm font-sans" 
                    value={reviewComment} 
                    onChange={e => setReviewComment(e.target.value)} 
                    placeholder="Enter details of review, e.g., 'Top Management reviewed the internal/external issues and interested parties expectations...'"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsReviewModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors font-sans">Cancel</button>
                <button onClick={handleLogReview} disabled={!reviewComment.trim()} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-sans disabled:opacity-50 disabled:cursor-not-allowed">Log Review</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Add Issue Modal */}
      <AnimatePresence>
        {isAddIssueOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
               <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                 <h3 className="text-lg font-semibold text-slate-800">{editingIssueId ? 'Edit Issue' : 'Add New Issue'}</h3>
                 <button onClick={() => setIsAddIssueOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-700">Issue Description</label>
                      <button
                        type="button"
                        onClick={handleAiRecommendSwotPestle}
                        disabled={isRecommending || !newIssue.text?.trim()}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 border border-indigo-150 rounded px-2 py-0.5 shadow-sm transition-all hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Let AI suggest Category, PESTLE, and Impact level"
                      >
                        {isRecommending ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-indigo-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            AI Suggest
                          </>
                        )}
                      </button>
                    </div>
                    <textarea rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 text-sm font-medium" value={newIssue.text || ''} onChange={e => setNewIssue({...newIssue, text: e.target.value})} placeholder="Describe the issue..."></textarea>
                  </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                       <select 
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" 
                         value={newIssue.category} 
                         onChange={e => {
                           const cat = e.target.value as any;
                           const isInternal = cat === 'strength' || cat === 'weakness';
                           setNewIssue({
                             ...newIssue,
                             category: cat,
                             pestleCategory: isInternal ? 'NA' : (newIssue.pestleCategory === 'NA' ? 'Political' : newIssue.pestleCategory)
                           });
                         }}
                       >
                         <option value="strength">Strength (Internal)</option>
                         <option value="weakness">Weakness (Internal)</option>
                         <option value="opportunity">Opportunity (External)</option>
                         <option value="threat">Threat (External)</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">PESTLE Category</label>
                       <select 
                         className={`w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                           (newIssue.category === 'strength' || newIssue.category === 'weakness') ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'text-slate-700'
                         }`}
                         value={(newIssue.category === 'strength' || newIssue.category === 'weakness') ? 'NA' : (newIssue.pestleCategory || 'NA')} 
                         disabled={newIssue.category === 'strength' || newIssue.category === 'weakness'}
                         onChange={e => setNewIssue({...newIssue, pestleCategory: e.target.value as any})}
                       >
                         <option value="NA">NA (Not Applicable)</option>
                         <option value="Political">Political</option>
                         <option value="Economic">Economic</option>
                         <option value="Social">Social</option>
                         <option value="Technological">Technological</option>
                         <option value="Legal">Legal</option>
                         <option value="Environmental">Environmental</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Impact Level</label>
                       <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" value={newIssue.impact} onChange={e => setNewIssue({...newIssue, impact: e.target.value as any})}>
                         <option value="low">Low Impact</option>
                         <option value="medium">Medium Impact</option>
                         <option value="high">High Impact</option>
                         <option value="critical">Critical</option>
                       </select>
                     </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Review Status</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" value={newIssue.imsStatus || 'Identified'} onChange={e => setNewIssue({...newIssue, imsStatus: e.target.value as any})}>
                          <option value="Identified">Identified</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Monitoring">Monitoring</option>
                          <option value="Reviewed">Reviewed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Trend</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" value={newIssue.trend || 'Stable'} onChange={e => setNewIssue({...newIssue, trend: e.target.value as any})}>
                          <option value="Increasing">Increasing</option>
                          <option value="Stable">Stable</option>
                          <option value="Reducing">Reducing</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Evaluation Decision</label>
                        <select 
                          className={`w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                            newIssue.isConverted ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'text-slate-700'
                          }`}
                          value={newIssue.evaluation || 'Monitor Only'} 
                          disabled={newIssue.isConverted}
                          onChange={e => setNewIssue({...newIssue, evaluation: e.target.value as any})}
                        >
                          <option value="Monitor Only">Monitor Only</option>
                          <option value="Escalate to Risk Register">Escalate to Risk Register</option>
                          <option value="Escalate to Opportunity Register">Escalate to Opportunity Register</option>
                          <option value="Management Review Input">Management Review Input</option>
                          <option value="Strategic Objective">Strategic Objective</option>
                          <option value="Management of Change">Management of Change</option>
                          <option value="No Further Action">No Further Action</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Review Date</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" 
                          value={newIssue.lastReviewDate || ''} 
                          onChange={e => setNewIssue({...newIssue, lastReviewDate: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" value={newIssue.frequency || 'when required'} onChange={e => setNewIssue({...newIssue, frequency: e.target.value as any})}>
                          <option value="quarterly">Quarterly</option>
                          <option value="half yearly">Half Yearly</option>
                          <option value="yearly">Yearly</option>
                          <option value="when required">When Required</option>
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
                 <div className="grid grid-cols-2 gap-4">
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
                     <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                     <select 
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" 
                       value={newParty.category || 'Internal'} 
                       onChange={e => setNewParty({...newParty, category: e.target.value as any})}
                     >
                       <option value="Internal">Internal</option>
                       <option value="External">External</option>
                     </select>
                   </div>
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
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Relevant Statutory or Compliance Obligations <span className="text-slate-400 text-xs font-normal">(Optional)</span></label>
                    <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm text-slate-700 font-sans" value={newParty.complianceObligations || ''} onChange={e => setNewParty({...newParty, complianceObligations: e.target.value})} placeholder="Any statutory/regulatory/compliance mandates..."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Associated Risks <span className="text-slate-400 text-xs font-normal">(Optional)</span></label>
                    <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm text-slate-700 font-sans" value={newParty.associatedRisks || ''} onChange={e => setNewParty({...newParty, associatedRisks: e.target.value})} placeholder="Associated risks if expectations are unmet..."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Associated Opportunities <span className="text-slate-400 text-xs font-normal">(Optional)</span></label>
                    <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm text-slate-700 font-sans" value={newParty.associatedOpportunities || ''} onChange={e => setNewParty({...newParty, associatedOpportunities: e.target.value})} placeholder="Associated opportunities if expectations are exceeded or met..."></textarea>
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

      {/* MOC Link Modal */}
      <AnimatePresence>
        {isMocModalOpen && selectedIssueForMoc && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Link Management of Change (MOC)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Link SWOT issue to an active MOC workflow or a document library MOC file</p>
                </div>
                <button onClick={() => setIsMocModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50/50 px-6">
                <button
                  onClick={() => { setMocModalTab('workflow'); setMocSearchQuery(''); }}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    mocModalTab === 'workflow' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  System MOC Workflows ({mocRecords.length})
                </button>
                <button
                  onClick={() => { setMocModalTab('document'); setMocSearchQuery(''); }}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    mocModalTab === 'document' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Document Library Files ({mocDocuments.length})
                </button>
              </div>

              {/* Search bar */}
              <div className="p-4 border-b border-slate-105">
                <input
                  type="text"
                  placeholder={`Search ${mocModalTab === 'workflow' ? 'MOC Number, Dept, or Description...' : 'Document Title or Number...'}`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
                  value={mocSearchQuery}
                  onChange={e => setMocSearchQuery(e.target.value)}
                />
              </div>

              {/* List */}
              <div className="p-4 overflow-y-auto flex-1 space-y-2 max-h-[40vh] custom-scrollbar bg-slate-50/50">
                {mocModalTab === 'workflow' ? (() => {
                  const filtered = mocRecords.filter(m => 
                    m.mocNo?.toLowerCase().includes(mocSearchQuery.toLowerCase()) ||
                    m.department?.toLowerCase().includes(mocSearchQuery.toLowerCase()) ||
                    m.description?.toLowerCase().includes(mocSearchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) return <p className="text-center text-sm text-slate-400 py-6">No matching MOC workflows found.</p>;

                  return filtered.map(m => (
                    <div key={m.id} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-4 group">
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase">{m.mocNo}</span>
                          <span className="text-xs font-semibold text-slate-500">{m.department}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize ${
                            m.status === 'Closed' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>{m.status}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1.5 line-clamp-2 leading-relaxed">{m.description}</p>
                      </div>
                      <button
                        onClick={() => handleLinkMocItem(m, 'workflow')}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shrink-0"
                      >
                        Link MOC
                      </button>
                    </div>
                  ));
                })() : (() => {
                  const filtered = mocDocuments.filter(d => 
                    d.title?.toLowerCase().includes(mocSearchQuery.toLowerCase()) ||
                    d.documentNumber?.toLowerCase().includes(mocSearchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) return <p className="text-center text-sm text-slate-400 py-6">No matching documents found.</p>;

                  return filtered.map(d => (
                    <div key={d.id} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-4 group">
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase">{d.documentNumber || 'NO CODE'}</span>
                          <span className="text-xs font-semibold text-slate-500 uppercase">{d.type}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1.5 truncate leading-relaxed">{d.title}</p>
                      </div>
                      <button
                        onClick={() => handleLinkMocItem(d, 'document')}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shrink-0"
                      >
                        Link Doc
                      </button>
                    </div>
                  ));
                })()}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button onClick={() => setIsMocModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}



const calculateNextReviewDate = (lastReviewDate: string | Date | undefined, frequency: string | undefined): string => {
  if (!lastReviewDate || !frequency || frequency === 'when required') {
    return 'When required';
  }
  const date = new Date(lastReviewDate);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  if (frequency === 'quarterly') {
    date.setMonth(date.getMonth() + 3);
  } else if (frequency === 'half yearly') {
    date.setMonth(date.getMonth() + 6);
  } else if (frequency === 'yearly') {
    date.setMonth(date.getMonth() + 12);
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const StandardBadge = ({ standard }: { standard: string }) => {
  if (standard.includes('9001')) return <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" title="Quality">ISO 9001</span>;
  if (standard.includes('14001')) return <span className="bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" title="Environment">ISO 14001</span>;
  if (standard.includes('45001')) return <span className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" title="Health & Safety">ISO 45001</span>;
  return null;
};

const IssueCard = ({ 
  issue, 
  onDelete, 
  onEdit,
  onUpdateField,
  onLinkMoc,
  onUnlinkMoc
}: { 
  issue: Issue, 
  onDelete?: () => void, 
  onEdit?: () => void,
  onUpdateField?: (field: keyof Issue, value: any) => void,
  onLinkMoc?: () => void,
  onUnlinkMoc?: () => void
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const getImpactColor = () => {
    const isPositive = issue.category === 'strength' || issue.category === 'opportunity';
    
    switch(issue.impact) {
      case 'critical': 
        return isPositive 
          ? 'bg-rose-100 text-rose-800 border-rose-200 shadow-sm animate-pulse' 
          : 'bg-red-200 text-red-950 border-red-300 font-extrabold shadow-sm animate-pulse';
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

      <div className="flex gap-1.5 flex-wrap mt-2">
        {issue.pestleCategory && issue.pestleCategory !== 'NA' && (
          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded shadow-sm">
            PESTLE: {issue.pestleCategory}
          </span>
        )}
        {issue.imsStatus && (
          <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded shadow-sm">
            Review Status: {issue.imsStatus}
          </span>
        )}
        {issue.trend && (
          <span className="text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-100 px-1.5 py-0.5 rounded shadow-sm">
            Trend: {issue.trend}
          </span>
        )}
        {issue.lastReviewDate && (
          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded shadow-sm">
            Last Rev: {new Date(issue.lastReviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {issue.frequency && (
          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded shadow-sm capitalize">
            Freq: {issue.frequency}
          </span>
        )}
        {issue.lastReviewDate && issue.frequency && (
          <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded shadow-sm">
            Next Rev: {calculateNextReviewDate(issue.lastReviewDate, issue.frequency)}
          </span>
        )}
      </div>

      {issue.evaluation === 'Management of Change' && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          {issue.linkedMocType && issue.linkedMocType !== 'none' ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate(issue.linkedMocType === 'workflow' ? '/moc' : `/documents/${issue.linkedMocDocumentId}`)}
                className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-sm flex items-center gap-1 hover:bg-indigo-100 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                {issue.linkedMocType === 'workflow' ? `MOC: ${issue.linkedMocNumber || 'Workflow'}` : `Doc: ${issue.linkedMocTitle || 'File'}`}
              </button>
              {isAdmin && onUnlinkMoc && (
                <button
                  onClick={onUnlinkMoc}
                  className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                  title="Remove Link"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ) : (
            isAdmin && onLinkMoc && (
              <button
                onClick={onLinkMoc}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-0.5 rounded shadow-sm flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Link MOC
              </button>
            )
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex gap-1 flex-wrap items-center">
          {issue.standards?.map(s => <StandardBadge key={s} standard={s} />)}
          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ml-1 ${getImpactColor()}`}>
            {issue.impact}
          </span>
        </div>
        
        {isAdmin && !(issue.isConverted && issue.linkedRiskId) && onUpdateField ? (
          <select
            className="bg-indigo-50 border border-indigo-100 rounded px-2 py-1 text-[11px] font-semibold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[130px] truncate"
            value={issue.evaluation || 'Monitor Only'}
            onChange={e => onUpdateField('evaluation', e.target.value as any)}
          >
            <option value="Monitor Only">Monitor Only</option>
            <option value="Escalate to Risk Register">Escalate Risk</option>
            <option value="Escalate to Opportunity Register">Escalate Opp</option>
            <option value="Management Review Input">Mgmt Review</option>
            <option value="Strategic Objective">Strategic Obj</option>
            <option value="Management of Change">MoC</option>
            <option value="No Further Action">NFA</option>
          </select>
        ) : (
          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shadow-sm">
            {(issue.isConverted && issue.linkedRiskId) ? `Linked (${issue.evaluation === 'Escalate to Risk Register' ? 'Risk' : 'Opp'})` : (issue.evaluation || 'Monitor Only')}
          </span>
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
  isLastOfGroup,
  isEvenGroup
}: { 
  party: Party, 
  onDelete?: () => void, 
  onEdit?: () => void, 
  isAdmin?: boolean,
  isFirst: boolean,
  rowSpan: number,
  isLastOfGroup: boolean,
  isEvenGroup: boolean
}) => {
  const rowBgClass = isEvenGroup ? 'bg-slate-50/50' : 'bg-white';
  const borderClass = isLastOfGroup ? 'border-b-2 border-slate-350 shadow-[inset_0_-1px_0_0_rgb(226,232,240)]' : 'border-b border-slate-100';

  return (
    <tr className={`hover:bg-slate-100/50 transition-colors group align-top ${rowBgClass}`}>
      {isFirst && (
        <td 
          className={`px-6 py-5 font-semibold text-slate-900 break-words border-r border-slate-200 align-middle text-center bg-slate-100/30 ${borderClass}`} 
          rowSpan={rowSpan}
        >
          <span className="inline-block px-3 py-1 bg-blue-100/60 text-blue-900 border border-blue-200/80 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap">
            {party.name}
          </span>
        </td>
      )}
      <td className={`px-6 py-4 whitespace-nowrap ${borderClass}`}>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
          party.category === 'External' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {party.category || 'Internal'}
        </span>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap ${borderClass}`}>
        <div className="flex gap-1 flex-wrap">
          {party.standards?.map((s: string) => <StandardBadge key={s} standard={s} />)}
        </div>
      </td>
      <td className={`px-6 py-4 text-sm text-slate-600 break-words leading-relaxed font-medium min-w-[250px] max-w-[400px] whitespace-normal ${borderClass}`}>
        {party.needs}
      </td>
      <td className={`px-6 py-4 text-sm text-slate-600 break-words leading-relaxed font-medium min-w-[250px] max-w-[400px] whitespace-normal ${borderClass}`}>
        {party.complianceObligations || <span className="text-slate-400 italic">None specified</span>}
      </td>
      <td className={`px-6 py-4 text-sm text-slate-600 break-words leading-relaxed font-medium min-w-[250px] max-w-[400px] whitespace-normal ${borderClass}`}>
        {party.associatedRisks?.trim() || <span className="text-slate-400 font-sans italic">N/A</span>}
      </td>
      <td className={`px-6 py-4 text-sm text-slate-600 break-words leading-relaxed font-medium min-w-[250px] max-w-[400px] whitespace-normal ${borderClass}`}>
        {party.associatedOpportunities?.trim() || <span className="text-slate-400 font-sans italic">N/A</span>}
      </td>
      <td className={`px-6 py-4 whitespace-nowrap ${borderClass}`}>
        <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full shadow-sm border ${
          party.risk === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 
          party.risk === 'Medium' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'
        }`}>
          {party.risk}
        </span>
      </td>
      <td className={`px-6 py-4 text-sm text-slate-600 min-w-[250px] max-w-[400px] whitespace-normal ${borderClass}`}>
         {party.actions && party.actions.length > 0 ? (
            <ul className="list-disc list-inside space-y-1.5 marker:text-slate-400">
               {party.actions.map((act, i) => (
                  <li key={i} className="leading-relaxed break-words">{act}</li>
               ))}
            </ul>
         ) : (
           <span className="text-slate-400 italic">No mitigations specified</span>
         )}
      </td>
      <td className={`px-6 py-4 whitespace-nowrap ${borderClass}`}>
        {party.responsible ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            {party.responsible}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">-</span>
        )}
      </td>
      {isAdmin && (
        <td className={`px-6 py-4 text-right whitespace-nowrap ${borderClass}`}>
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
