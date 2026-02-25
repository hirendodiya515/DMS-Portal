import React, { useState, useEffect } from 'react';
import {
  X, Shield, Clock, CheckCircle2, AlertCircle,
  Edit, Save, Trash2, FileText,
  Info, Plus
} from 'lucide-react';
import api from '../../lib/api';

interface RiskDetailsModalProps {
  type: 'hira' | 'eaa' | 'qra';
  risk: any;
  initialIsEditing?: boolean;
  onClose: () => void;
  onUpdate: () => void;
  departments: string[];
}

const RiskDetailsModal: React.FC<RiskDetailsModalProps> = ({ type, risk, initialIsEditing, onClose, onUpdate, departments }) => {
  const [isEditing, setIsEditing] = useState(initialIsEditing || false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'assessment' | 'workflow'>('details');
  const [formData, setFormData] = useState({ 
    ...risk,
    items: risk.items || []
  });

  // Keep internal state in sync with prop changes (e.g. after a refresh from parent)
  useEffect(() => {
    setFormData({
      ...risk,
      items: risk.items || []
    });
  }, [risk]);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), {
        hazardOrAspect: '',
        consequenceOrImpact: '',
        likelihood: 3,
        severity: 3,
        currentControls: '',
        proposedActions: '',
        residualLikelihood: 1,
        residualSeverity: 1,
      }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        items: formData.items
      };
      
      // Sync names based on type
      if (type === 'hira') {
        payload.activity = formData.activity || formData.title;
        payload.location = formData.location || formData.area;
        payload.subActivity = formData.subActivity;
      } else if (type === 'eaa') {
        payload.process = formData.process || formData.title;
        payload.area = formData.area || formData.location;
        payload.subActivity = formData.subActivity;
      } else if (type === 'qra') {
        payload.riskCategory = formData.riskCategory || formData.title;
        payload.process = formData.process || formData.location;
        payload.subActivity = formData.subActivity;
      }

      await api.patch(`/risks/${risk.id}`, { ...payload, type });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error updating risk:', err);
      alert('Failed to update assessment');
    } finally {
      setSaving(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-100';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      default: return 'text-green-600 bg-green-50 border-green-100';
    }
  };

  const calculateRiskLevel = (score: number) => {
    if (score >= 17) return 'critical';
    if (score >= 10) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'open': return 'text-green-600 bg-green-50';
      case 'pending_review': return 'text-yellow-600 bg-yellow-50';
      case 'draft': return 'text-slate-500 bg-slate-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const riskTitle = type === 'hira' ? risk.activity : 
                    type === 'eaa' ? risk.process : 
                    risk.riskCategory;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200 relative">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between relative z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${getLevelColor(risk.maxRiskLevel)}`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-blue-600 font-mono font-bold text-[10px] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider">{risk.riskNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getLevelColor(risk.maxRiskLevel)}`}>
                  {risk.maxRiskLevel} Risk
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusColor(risk.status)} border border-transparent`}>
                  {risk.status?.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight line-clamp-1">{riskTitle || risk.title}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-black transition-all shadow-md shadow-slate-200"
              >
                <Edit className="w-3.5 h-3.5" />
                EDIT ASSESSMENT
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-all border border-slate-100">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 bg-slate-50/50 border-b border-slate-100 flex gap-6">
          {[
            { id: 'details', label: 'Overview', icon: FileText },
            { id: 'assessment', label: 'Risk Assessment', icon: AlertCircle },
            { id: 'workflow', label: 'Review & History', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 border-b-2 font-bold text-[10px] uppercase tracking-wider transition-all ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50/10">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    Identification Details
                  </h4>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Department</p>
                        <p className="text-sm font-bold text-slate-700">{risk.department}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Location / Area</p>
                        <p className="text-sm font-bold text-slate-700">{type === 'hira' ? risk.location : type === 'eaa' ? risk.area : risk.process}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>Identified {type === 'hira' ? 'Hazards' : type === 'eaa' ? 'Aspects' : 'Failure Modes'}</span>
                    <button 
                      onClick={() => {
                        setIsEditing(true);
                        addItem();
                      }}
                      className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[8px] font-bold uppercase tracking-wider border border-blue-100 hover:bg-blue-100 transition-all"
                    >
                      + Add New {type.toUpperCase()}
                    </button>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded tabular-nums font-mono">{formData.items?.length || 0} TOTAL</span>
                  </h4>
                  {formData.items?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                        <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getLevelColor(item.level || 'low')}`}>
                          {item.level || 'low'}
                        </div>
                      </div>
                      {/* Sub-Activity per item */}
                      {(item.subActivity || isEditing) && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Sub-Activity</p>
                          {isEditing ? (
                            <input
                              placeholder="e.g., Overhead welding on mezzanine"
                              className="w-full px-2 py-1.5 bg-white border border-amber-200 rounded outline-none text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-100"
                              value={item.subActivity || ''}
                              onChange={e => updateItem(idx, 'subActivity', e.target.value)}
                            />
                          ) : (
                            <p className="text-xs font-bold text-slate-800">{item.subActivity}</p>
                          )}
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                          {type === 'hira' ? 'HAZARD' : type === 'eaa' ? 'ASPECT' : 'FAILURE MODE'}
                        </p>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{item.hazardOrAspect}"</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider mb-0.5">
                          {type === 'hira' ? 'RESULTANT RISK' : type === 'eaa' ? 'IMPACT' : 'POTENTIAL IMPACT'}
                        </p>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{item.consequenceOrImpact}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Control Status</h4>
                  <div className="bg-slate-900 p-8 rounded-[38px] text-white relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full"></div>
                    <div className="relative z-10 space-y-6">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aggregate Mitigation Overview</p>
                      <div className="space-y-6">
                        {formData.items?.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="space-y-2">
                             <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Item #{idx + 1}</span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Residual: {item.residualLikelihood * item.residualSeverity}</span>
                             </div>
                             <p className="text-xs text-slate-200 line-clamp-2 italic font-medium">"{item.currentControls || 'No current controls recorded'}"</p>
                          </div>
                        ))}
                        {formData.items?.length > 3 && (
                          <p className="text-[10px] text-blue-400 font-black uppercase italic tracking-widest">+ {formData.items.length - 3} more assessments...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assessment' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {formData.items?.map((item: any, idx: number) => (
                 <div key={idx} className="space-y-6">
                    <div className="flex items-center gap-3">
                       <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center font-black text-xs">{idx + 1}</span>
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[500px]">Assessment: {item.hazardOrAspect}</h5>
                    </div>
                    
                     {/* -- Risk Score Comparison + Effective Reduction side by side -- */}
                     <div className="flex gap-4" style={{height: '180px'}}>
                       {/* Risk Score Comparison card */}
                       <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex-1">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Risk Score Comparison</p>
                        <div className="flex items-center justify-around">
                          {/* Initial Risk */}
                          {(() => {
                            const score = item.likelihood * item.severity;
                            const level = item.level || calculateRiskLevel(score);
                            const ringColor = level?.toLowerCase() === 'critical' ? '#dc2626' : level?.toLowerCase() === 'high' ? '#f97316' : level?.toLowerCase() === 'medium' ? '#eab308' : '#22c55e';
                            const pct = Math.min(score / 25, 1);
                            const r = 34; const circ = 2 * Math.PI * r;
                            return (
                              <div className="flex flex-col items-center gap-2">
                                <div className="relative w-20 h-20">
                                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8"/>
                                    <circle cx="40" cy="40" r={r} fill="none" stroke={ringColor} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" style={{transition:'stroke-dashoffset 0.6s ease'}}/>
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-black text-slate-900 leading-none">{score}</span>
                                    <span className="text-[7px] font-black uppercase tracking-wide leading-none mt-0.5" style={{color: ringColor}}>{level}</span>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Initial Risk</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">L: {item.likelihood} · S: {item.severity}</p>
                                </div>
                              </div>
                            );
                          })()}
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-px h-6 bg-slate-100"></div>
                            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 20 20"><path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <div className="w-px h-6 bg-slate-100"></div>
                          </div>
                          {/* Residual Risk */}
                          {(() => {
                            const rl = item.residualLikelihood || 1;
                            const rs = item.residualSeverity || 1;
                            const score = rl * rs;
                            const level = item.residualLevel || calculateRiskLevel(score);
                            const ringColor = level?.toLowerCase() === 'critical' ? '#dc2626' : level?.toLowerCase() === 'high' ? '#f97316' : level?.toLowerCase() === 'medium' ? '#eab308' : '#22c55e';
                            const pct = Math.min(score / 25, 1);
                            const r = 34; const circ = 2 * Math.PI * r;
                            return (
                              <div className="flex flex-col items-center gap-2">
                                <div className="relative w-20 h-20">
                                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8"/>
                                    <circle cx="40" cy="40" r={r} fill="none" stroke={ringColor} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" style={{transition:'stroke-dashoffset 0.6s ease'}}/>
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-black text-slate-900 leading-none">{score}</span>
                                    <span className="text-[7px] font-black uppercase tracking-wide leading-none mt-0.5" style={{color: ringColor}}>{level}</span>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Residual Risk</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">L: {rl} · S: {rs}</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                       </div>

                        {/* Effective Reduction — square card */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center h-full aspect-square pt-4 pb-4 shrink-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">Effective<br/>Reduction</p>
                          <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="text-3xl font-black text-blue-600 leading-none">
                              {item.likelihood * item.severity - (item.residualLikelihood * item.residualSeverity || 0)}
                            </div>
                            <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">pts</div>
                          </div>
                        </div>
                     </div>

                     <div className="space-y-3">
                        {/* Two boxes side by side */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                Mitigation Control
                              </p>
                              <p className="text-xs text-slate-600 font-medium italic leading-relaxed">"{item.currentControls || 'No current controls recorded'}"</p>
                           </div>
                           <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                              <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                                Mitigation Plan
                              </p>
                              <p className="text-xs text-slate-600 font-medium italic leading-relaxed">"{item.proposedActions || 'No plan recorded'}"</p>
                           </div>
                        </div>
                     </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'workflow' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl mx-auto">
               <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Workflow Pipeline</h4>
                  <div className="relative pl-10 space-y-12">
                     <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
                     
                     <div className="relative">
                        <div className="absolute -left-[35px] top-0 w-8 h-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center text-white shadow-lg">
                           <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Created & Registered</h5>
                        <p className="text-xs text-slate-500 font-medium">By {risk.owner?.firstName} {risk.owner?.lastName} on {new Date(risk.createdAt).toLocaleDateString()}</p>
                     </div>

                     <div className="relative">
                        <div className={`absolute -left-[35px] top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-colors ${
                          ['pending_review', 'approved', 'open', 'closed'].includes(risk.status) ? 'bg-blue-500 text-white' : 'bg-white text-slate-200'
                        }`}>
                           <Clock className="w-4 h-4" />
                        </div>
                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Departmental Review</h5>
                        <p className="text-xs text-slate-500 font-medium">Assigned to: {risk.reviewer?.firstName} {risk.reviewer?.lastName || 'Department Head'}</p>
                     </div>

                     <div className="relative">
                        <div className={`absolute -left-[35px] top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-colors ${
                          ['approved', 'open', 'closed'].includes(risk.status) ? 'bg-green-500 text-white' : 'bg-white text-slate-200'
                        }`}>
                           <Shield className="w-4 h-4" />
                        </div>
                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Final Authorization</h5>
                        <p className="text-xs text-slate-500 font-medium">{risk.reviewComments ? `Comment: ${risk.reviewComments}` : 'Awaiting final sign-off'}</p>
                     </div>
                  </div>
               </div>
             </div>
          )}
        </div>

        {/* Edit View Overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-white z-[70] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-400 ease-out">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shadow-sm relative z-20 bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Modify Assessment</h3>
                <p className="text-[11px] text-slate-500 font-bold font-mono uppercase tracking-widest">{risk.riskNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={addItem}
                   className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-blue-100 hover:bg-blue-100 transition-all font-mono"
                 >
                   + Add Item
                 </button>
                 <button 
                    onClick={() => setIsEditing(false)}
                    className="p-2 hover:bg-slate-50 rounded-xl transition-all border border-slate-100"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50/30">
              <div className="max-w-4xl mx-auto space-y-8 pb-10">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                   <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 px-1 border-l-4 border-blue-600 pl-3">Identification Info</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="col-span-full">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Assessment Header Title *</label>
                          <input 
                            type="text"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800"
                            value={formData[type === 'hira' ? 'activity' : type === 'eaa' ? 'process' : 'riskCategory'] || formData.title}
                            onChange={e => setFormData({
                              ...formData, 
                              [type === 'hira' ? 'activity' : type === 'eaa' ? 'process' : 'riskCategory']: e.target.value,
                              title: e.target.value
                            })}
                          />
                      </div>
                      
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Department</label>
                          <select 
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800"
                            value={formData.department}
                            onChange={e => setFormData({...formData, department: e.target.value})}
                          >
                            <option value="">Select Dept</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Physical Location / Process Area</label>
                          <input 
                            type="text"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800"
                            value={type === 'hira' ? formData.location : type === 'eaa' ? formData.area : formData.process}
                            onChange={e => setFormData({
                              ...formData, 
                              [type === 'hira' ? 'location' : type === 'eaa' ? 'area' : 'process']: e.target.value
                            })}
                          />
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1 border-l-4 border-emerald-500 pl-3">Assessment Matrix</h4>
                   {formData.items?.map((item: any, index: number) => (
                      <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 relative group/item">
                         {formData.items.length > 1 && (
                            <button 
                              onClick={() => removeItem(index)}
                              className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-lg hover:bg-red-50 z-10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                         )}
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hazard Item #{index + 1}</span>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                               <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">
                                 {type === 'hira' ? 'HAZARD DESCRIPTION' : type === 'eaa' ? 'ENVIRONMENTAL ASPECT' : 'FAILURE MODE'}
                               </label>
                               <textarea 
                                 rows={3}
                                 className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 italic text-sm"
                                 value={item.hazardOrAspect}
                                 onChange={e => updateItem(index, 'hazardOrAspect', e.target.value)}
                               />
                            </div>
                            <div className="space-y-4">
                               <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">
                                 {type === 'hira' ? 'CONSEQUENT RISK' : type === 'eaa' ? 'ENVIRONMENTAL IMPACT' : 'POTENTIAL IMPACT'}
                               </label>
                               <textarea 
                                 rows={3}
                                 className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 italic text-sm"
                                 value={item.consequenceOrImpact}
                                 onChange={e => updateItem(index, 'consequenceOrImpact', e.target.value)}
                               />
                            </div>

                            <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-8">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Risk Assessment (L × S)</p>
                               <div className="flex justify-around items-start">
                                  <div className="space-y-4 flex flex-col items-center">
                                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Likelihood</label>
                                     <div className="flex gap-1.5 justify-center">
                                        {[1,2,3,4,5].map(n => (
                                          <button 
                                            key={n}
                                            onClick={() => updateItem(index, 'likelihood', n)}
                                            className={`w-9 h-9 rounded-xl font-black text-xs transition-all ${item.likelihood === n ? 'bg-blue-600 text-white shadow-xl' : 'bg-white border border-slate-100 text-slate-400 hover:bg-white'}`}
                                          >
                                            {n}
                                          </button>
                                        ))}
                                     </div>
                                  </div>
                                  <div className="w-px h-16 bg-slate-200 self-center"></div>
                                  <div className="space-y-4 flex flex-col items-center">
                                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Severity</label>
                                     <div className="flex gap-1.5 justify-center">
                                        {[1,2,3,4,5].map(n => (
                                          <button 
                                            key={n}
                                            onClick={() => updateItem(index, 'severity', n)}
                                            className={`w-9 h-9 rounded-xl font-black text-xs transition-all ${item.severity === n ? 'bg-blue-600 text-white shadow-xl' : 'bg-white border border-slate-100 text-slate-400 hover:bg-white'}`}
                                          >
                                            {n}
                                          </button>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                               <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                  <span className="text-[10px] font-black text-slate-400 uppercase">Assessment Level</span>
                                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase italic ${getLevelColor(calculateRiskLevel(item.likelihood * item.severity))}`}>
                                     {calculateRiskLevel(item.likelihood * item.severity)} (Score: {item.likelihood * item.severity})
                                  </div>
                               </div>
                            </div>

                            <div className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100 space-y-8">
                               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-center">Residual Safety Target</p>
                               <div className="grid grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                     <label className="text-[9px] font-black text-slate-500 uppercase block text-center">Target L</label>
                                     <select 
                                       className="w-full bg-white border border-blue-100 px-4 py-3 rounded-2xl font-black text-blue-600 outline-none text-sm shadow-sm"
                                       value={item.residualLikelihood}
                                       onChange={e => updateItem(index, 'residualLikelihood', parseInt(e.target.value))}
                                     >
                                       {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                     </select>
                                  </div>
                                  <div className="space-y-4">
                                     <label className="text-[9px] font-black text-slate-500 uppercase block text-center">Target S</label>
                                     <select 
                                       className="w-full bg-white border border-blue-100 px-4 py-3 rounded-2xl font-black text-blue-600 outline-none text-sm shadow-sm"
                                       value={item.residualSeverity}
                                       onChange={e => updateItem(index, 'residualSeverity', parseInt(e.target.value))}
                                     >
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                     </select>
                                  </div>
                               </div>
                               <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase">Projected Target Score</span>
                                  <span className="text-xl font-black tabular-nums">{item.residualLikelihood * item.residualSeverity}</span>
                               </div>
                            </div>

                            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                               <div className="space-y-3">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Mitigating Controls</label>
                                  <textarea 
                                    rows={3}
                                    placeholder="Enter existing defenses..."
                                    className="w-full px-6 py-4 bg-white border border-slate-100 rounded-3xl font-bold text-slate-800 text-sm shadow-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                                    value={item.currentControls}
                                    onChange={e => updateItem(index, 'currentControls', e.target.value)}
                                  />
                               </div>
                               <div className="space-y-3">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Proposed Corrective Actions</label>
                                  <textarea 
                                    rows={3}
                                    placeholder="Enter planned improvements..."
                                    className="w-full px-6 py-4 bg-white border border-slate-100 rounded-3xl font-bold text-slate-800 text-sm shadow-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                                    value={item.proposedActions}
                                    onChange={e => updateItem(index, 'proposedActions', e.target.value)}
                                  />
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
                <div className="pt-4">
                  <button
                    onClick={addItem}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    + Add Another Item
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all"
                  >
                    CANCEL CHANGES
                  </button>
                   <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 ${saving ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin" />
                        SAVING...
                      </span>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        SAVE ASSESSMENT
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        {!isEditing && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white relative z-10">
            <div className="flex items-center gap-4">
               {/* Metadata or summary info can go here */}
            </div>
            
            <div className="flex gap-3">
              {risk.status === 'draft' && (
                <button 
                  onClick={async () => {
                    if (window.confirm('Delete this assessment draft permanently?')) {
                        await api.delete(`/risks/${risk.id}`, { params: { type } });
                        onClose();
                        onUpdate();
                    }
                  }}
                  className="px-6 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all border border-red-100 flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Trash2 className="w-4 h-4" />
                  DELETE DRAFT
                </button>
              )}
              <button 
                onClick={onClose}
                className="px-10 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md shadow-slate-200 text-xs uppercase tracking-widest"
              >
                CLOSE VIEW
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskDetailsModal;
