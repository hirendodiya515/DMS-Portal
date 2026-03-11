import { useState, useEffect, Fragment } from 'react';
import { 
  Plus, Search, Filter, Edit2, Copy, Trash2, 
  ChevronDown, ChevronRight, AlertTriangle
} from 'lucide-react';
import { pfmeaApi } from '../../../lib/pfmeaApi';
import { useAuthStore } from '../../../stores/authStore';

interface WorksheetTabProps {
  pfmeaId: string;
  externalAddTrigger?: number;
}

interface FMEA_Row {
  id: string;
  processStep: string;
  processDesc: string;
  failureMode: string;
  effects: string;
  severity: number;
  effectClass: 'Critical' | 'Major' | 'Minor';
  causes: string;
  occurrence: number;
  prevention: string;
  detectionControl: string;
  detection: number;
  rpn: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  action: string;
  responsible: string;
  targetDate: string;
  status: 'Open' | 'In Progress' | 'Completed';
  postS: number | null;
  postO: number | null;
  postD: number | null;
  revisedRpn: number | null;
  remarks: string;
}



export default function WorksheetTab({ pfmeaId, externalAddTrigger }: WorksheetTabProps) {
  const [data, setData] = useState<FMEA_Row[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const canEdit = ['admin', 'creator', 'reviewer', 'dept_head'].includes(currentUser?.role || '');
  const canDelete = currentUser?.role === 'admin';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (pfmeaId === 'ALL') {
      pfmeaApi.getAll().then(allProcesses => {
        Promise.all(allProcesses.map((p: any) => pfmeaApi.getOne(p.id))).then(responses => {
          const allRows = responses.flatMap(res => res ? res.worksheetRows : []).filter(Boolean);
          setData(allRows);
          setIsInitializing(false);
        });
      });
    } else if (pfmeaId) {
      pfmeaApi.getOne(pfmeaId).then(res => {
        if(res && res.worksheetRows) {
           setData(res.worksheetRows);
        }
        setIsInitializing(false);
      });
    }
  }, [pfmeaId]);

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const calculateRiskLevel = (rpn: number): 'Critical' | 'High' | 'Medium' | 'Low' => {
    if (rpn >= 60) return 'Critical';
    if (rpn >= 30) return 'High';
    if (rpn >= 15) return 'Medium';
    return 'Low';
  };

  const updateRowField = (id: string, field: keyof FMEA_Row, value: any) => {
    setData(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // Auto-calculate RPN if S, O, or D changes
        if (['severity', 'occurrence', 'detection'].includes(field)) {
          updatedRow.rpn = updatedRow.severity * updatedRow.occurrence * updatedRow.detection;
          updatedRow.riskLevel = calculateRiskLevel(updatedRow.rpn);
        }

        // Auto-calculate Post RPN
        if (['postS', 'postO', 'postD'].includes(field) && updatedRow.postS && updatedRow.postO && updatedRow.postD) {
          updatedRow.revisedRpn = updatedRow.postS * updatedRow.postO * updatedRow.postD;
        }

        return updatedRow;
      }
      return row;
    }));
  };

  const syncRowToDb = async (id: string) => {
    const rowToSave = data.find(r => r.id === id);
    if (!rowToSave) return;
    try {
       await pfmeaApi.updateRow(pfmeaId, rowToSave.id, rowToSave);
    } catch(e) {
       console.error("Failed syncing row to DB", e);
    }
  };

  const handleSaveEdit = (id: string) => {
     setEditingId(null);
     syncRowToDb(id);
  };

  const handleAddRow = async () => {
    const newRowBase = {
      processStep: 'New Step',
      failureMode: 'New Failure Mode',
      severity: 1,
      occurrence: 1,
      detection: 1,
      rpn: 1,
      riskLevel: 'Low',
      status: 'Open'
    };
    
    try {
      const dbRow = await pfmeaApi.addRow(pfmeaId, newRowBase);
      setData(prev => [...prev, dbRow]);
      setEditingId(dbRow.id);
      showToast("✅ New process step appended to the bottom.");
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (externalAddTrigger && externalAddTrigger > 0) {
      handleAddRow();
    }
  }, [externalAddTrigger]);

  const handleDeleteRow = async (id: string) => {
    if(confirm("Are you sure you want to delete this row?")) {
      try {
        await pfmeaApi.deleteRow(pfmeaId, id);
        setData(data.filter(r => r.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDuplicateRow = async (row: FMEA_Row) => {
    const { id, pfmeaId: _, ...duplicateData } = row as any;
    try {
      const dbRow = await pfmeaApi.addRow(pfmeaId, duplicateData);
      setData([...data, dbRow]);
      showToast("✅ Row successfully duplicated at the bottom.");
    } catch (e) {
      console.error(e);
    }
  };

  if (isInitializing) return <div className="p-4 text-slate-500 font-bold">Synchronizing Worksheet...</div>;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800 text-white font-semibold rounded-full shadow-lg shadow-slate-300/50 flex items-center gap-3 z-[100] animate-in fade-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search failure modes, processes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
        {canEdit && (
          <button 
            onClick={handleAddRow}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        )}
      </div>

      {/* Main Table Container */}
      <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 shadow-sm">
        <div className="overflow-x-auto h-[600px]"> {/* Fixed height for sticky header scroll */}
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 w-10"></th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 min-w-[150px]">Process Step</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 min-w-[200px]">Failure Mode</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 text-center bg-red-50/30">S</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 text-center bg-orange-50/30">O</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 text-center bg-blue-50/30">D</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 text-center min-w-[100px] shadow-sm">RPN</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 min-w-[120px]">Risk Level</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 min-w-[200px]">Causes of failure</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 min-w-[150px]">Current Prevention Control</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 min-w-[150px]">Current Detection Control</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 bg-slate-50 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.filter(r => r.failureMode.toLowerCase().includes(searchTerm.toLowerCase()) || r.processStep.toLowerCase().includes(searchTerm.toLowerCase())).map((row) => (
                <Fragment key={row.id}>
                  {/* Primary Data Row */}
                  <tr className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 text-center cursor-pointer" onClick={() => toggleRow(row.id)}>
                      {expandedRows.has(row.id) ? 
                        <ChevronDown className="w-5 h-5 text-slate-400" /> : 
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      }
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {editingId === row.id ? (
                        <input 
                          type="text" 
                          value={row.processStep} 
                          onChange={(e) => updateRowField(row.id, 'processStep', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-400 rounded"
                        />
                      ) : row.processStep}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {editingId === row.id ? (
                        <input 
                          type="text" 
                          value={row.failureMode} 
                          onChange={(e) => updateRowField(row.id, 'failureMode', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-400 rounded"
                        />
                      ) : row.failureMode}
                    </td>
                    
                    {/* Score Cells */}
                    <td className="px-4 py-3 text-center">
                      {editingId === row.id ? (
                        <select 
                          value={row.severity}
                          onChange={(e) => updateRowField(row.id, 'severity', parseInt(e.target.value))}
                          className="w-12 h-8 px-1 py-1 border border-blue-400 rounded text-center bg-red-50 text-red-700 font-bold"
                        >
                          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      ) : (
                        <span className="inline-flex w-7 h-7 items-center justify-center bg-red-50 text-red-700 font-bold rounded-lg border border-red-100">{row.severity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === row.id ? (
                        <select 
                          value={row.occurrence}
                          onChange={(e) => updateRowField(row.id, 'occurrence', parseInt(e.target.value))}
                          className="w-12 h-8 px-1 py-1 border border-blue-400 rounded text-center bg-orange-50 text-orange-700 font-bold"
                        >
                          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      ) : (
                        <span className="inline-flex w-7 h-7 items-center justify-center bg-orange-50 text-orange-700 font-bold rounded-lg border border-orange-100">{row.occurrence}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === row.id ? (
                        <select 
                          value={row.detection}
                          onChange={(e) => updateRowField(row.id, 'detection', parseInt(e.target.value))}
                          className="w-12 h-8 px-1 py-1 border border-blue-400 rounded text-center bg-blue-50 text-blue-700 font-bold"
                        >
                          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      ) : (
                        <span className="inline-flex w-7 h-7 items-center justify-center bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-100">{row.detection}</span>
                      )}
                    </td>
                    
                    {/* RPN Calculation */}
                    <td className="px-4 py-3 text-center text-lg font-black text-slate-800 tracking-tight">
                      {row.rpn}
                    </td>
                    
                    {/* Classification */}
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getRiskColor(row.riskLevel)}`}>
                        {row.riskLevel}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">
                      {editingId === row.id ? (
                        <input 
                          type="text" 
                          value={row.causes} 
                          onChange={(e) => updateRowField(row.id, 'causes', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-400 rounded"
                        />
                      ) : row.causes}
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                      {editingId === row.id ? (
                        <input 
                          type="text" 
                          value={row.prevention} 
                          onChange={(e) => updateRowField(row.id, 'prevention', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-400 rounded"
                        />
                      ) : row.prevention}
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                      {editingId === row.id ? (
                        <input 
                          type="text" 
                          value={row.detectionControl} 
                          onChange={(e) => updateRowField(row.id, 'detectionControl', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-400 rounded"
                        />
                      ) : row.detectionControl}
                    </td>
                    
                    {/* Row Actions */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingId === row.id ? (
                          <button 
                            onClick={() => handleSaveEdit(row.id)}
                            className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded hover:bg-emerald-200 transition-colors"
                          >
                            Save
                          </button>
                        ) : (
                          <>
                            {canEdit && (
                              <>
                                <button onClick={() => setEditingId(row.id)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDuplicateRow(row)} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"><Copy className="w-4 h-4" /></button>
                              </>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDeleteRow(row.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {expandedRows.has(row.id) && (
                    <tr className="bg-slate-50/80 border-b border-slate-200 shadow-inner">
                      <td colSpan={12} className="px-8 py-6">
                        <div className="grid grid-cols-3 gap-8">
                          {/* Block 1 */}
                          <div className="space-y-4 min-w-0">
                            <div className="flex flex-col gap-2">
                              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Process Description & Effects of failure</span>
                              {editingId === row.id ? (
                                <textarea
                                  value={row.processDesc}
                                  onChange={(e) => updateRowField(row.id, 'processDesc', e.target.value)}
                                  placeholder="Process Description"
                                  className="block w-full px-2 py-1 border border-blue-400 rounded text-sm resize-none"
                                  rows={2}
                                />
                              ) : (
                                <p className="text-sm text-slate-800">{row.processDesc}</p>
                              )}

                              {editingId === row.id ? (
                                <textarea
                                  value={row.effects}
                                  onChange={(e) => updateRowField(row.id, 'effects', e.target.value)}
                                  placeholder="Effects of failure"
                                  className="block w-full px-2 py-1 border border-blue-400 rounded text-sm text-red-600 resize-none"
                                  rows={2}
                                />
                              ) : (
                                <p className="text-sm text-red-600">{row.effects} ({row.effectClass})</p>
                              )}
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Action & Status</span>
                              <div className="flex items-center gap-3">
                                {editingId === row.id ? (
                                  <select 
                                    value={row.status}
                                    onChange={(e) => updateRowField(row.id, 'status', e.target.value)}
                                    className="px-2 py-1 text-xs font-bold rounded-md border border-blue-400"
                                  >
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                                    row.status === 'Open' ? 'bg-yellow-200 text-yellow-800' :
                                    row.status === 'In Progress' ? 'bg-blue-200 text-blue-800' :
                                    'bg-emerald-200 text-emerald-800'
                                  }`}>{row.status}</span>
                                )}
                                
                                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                                  <span className="text-xs font-bold text-slate-500 uppercase">Target Date:</span>
                                  {editingId === row.id ? (
                                    <input 
                                      type="date"
                                      value={row.targetDate || ''}
                                      onChange={(e) => updateRowField(row.id, 'targetDate', e.target.value)}
                                      className="px-2 py-1 text-sm border border-blue-400 rounded"
                                    />
                                  ) : (
                                    <span className="text-sm font-semibold text-slate-700">{row.targetDate || 'Not set'}</span>
                                  )}
                                </div>
                              </div>
                              {editingId === row.id ? (
                                <textarea
                                  value={row.action}
                                  onChange={(e) => updateRowField(row.id, 'action', e.target.value)}
                                  placeholder="Action Plan"
                                  className="block w-full px-2 py-1 mt-2 border border-blue-400 rounded text-sm resize-none"
                                  rows={2}
                                />
                              ) : (
                                <p className="text-sm text-slate-800 mt-2">{row.action}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Block 2 */}
                          <div className="space-y-4 min-w-0">
                            <div>
                              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Responsibility</span>
                              {editingId === row.id ? (
                                <input 
                                  type="text" 
                                  value={row.responsible} 
                                  onChange={(e) => updateRowField(row.id, 'responsible', e.target.value)}
                                  className="w-full px-2 py-1 border border-blue-400 rounded text-sm"
                                />
                              ) : (
                                <p className="text-sm text-slate-800">{row.responsible}</p>
                              )}
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Remarks / Notes</span>
                              {editingId === row.id ? (
                                <textarea
                                  value={row.remarks}
                                  onChange={(e) => updateRowField(row.id, 'remarks', e.target.value)}
                                  className="block w-full px-2 py-1 border border-blue-400 rounded text-sm italic resize-none"
                                  rows={3}
                                />
                              ) : (
                                <p className="text-sm text-slate-600 italic">"{row.remarks}"</p>
                              )}
                            </div>
                          </div>

                          {/* Block 3 - Post Action Reassessment */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-w-0">
                            <span className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-emerald-500" /> Post-Action Reassessment
                            </span>
                            <div className="flex items-center gap-6 mb-3">
                              <div className="text-center">
                                <span className="block text-xs text-slate-500 mb-1">Sev</span>
                                {editingId === row.id ? (
                                  <select 
                                    value={row.postS || ''}
                                    onChange={(e) => updateRowField(row.id, 'postS', e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-10 h-8 border border-blue-400 rounded text-center text-sm font-bold"
                                  >
                                    <option value="">-</option>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                ) : (
                                  <span className="inline-flex w-8 h-8 items-center justify-center bg-slate-50 text-slate-700 font-bold rounded-lg border border-slate-200">
                                    {row.postS || '-'}
                                  </span>
                                )}
                              </div>
                              <div className="text-center">
                                <span className="block text-xs text-slate-500 mb-1">Occ</span>
                                {editingId === row.id ? (
                                  <select 
                                    value={row.postO || ''}
                                    onChange={(e) => updateRowField(row.id, 'postO', e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-10 h-8 border border-blue-400 rounded text-center text-sm font-bold"
                                  >
                                    <option value="">-</option>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                ) : (
                                  <span className="inline-flex w-8 h-8 items-center justify-center bg-slate-50 text-slate-700 font-bold rounded-lg border border-slate-200">
                                    {row.postO || '-'}
                                  </span>
                                )}
                              </div>
                              <div className="text-center">
                                <span className="block text-xs text-slate-500 mb-1">Det</span>
                                {editingId === row.id ? (
                                  <select 
                                    value={row.postD || ''}
                                    onChange={(e) => updateRowField(row.id, 'postD', e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-10 h-8 border border-blue-400 rounded text-center text-sm font-bold"
                                  >
                                    <option value="">-</option>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                ) : (
                                  <span className="inline-flex w-8 h-8 items-center justify-center bg-slate-50 text-slate-700 font-bold rounded-lg border border-slate-200">
                                    {row.postD || '-'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-500 mb-1">Revised RPN</span>
                              <span className={`text-2xl font-black ${row.revisedRpn ? 'text-emerald-600' : 'text-slate-300'}`}>
                                {row.revisedRpn || '---'}
                              </span>
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
