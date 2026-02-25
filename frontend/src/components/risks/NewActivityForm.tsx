import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Save, Shield, Plus } from 'lucide-react';

interface NewActivityFormProps {
  type: 'hira' | 'eaa' | 'qra';
  onClose: () => void;
  onSubmit: (data: any) => void;
  departments: string[];
}

const NewActivityForm: React.FC<NewActivityFormProps> = ({ type, onClose, onSubmit, departments }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // General
    name: '', // Maps to activity/process/riskCategory
    department: '',
    task: '', // HIRA specific
    date: new Date().toISOString().split('T')[0],
    location: '', // Maps to location/area/process
    
    // Multiple Items
    items: [{
      subActivity: '',
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

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        subActivity: '',
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

  const steps = [
    { id: 1, title: 'Evaluation Info' },
    { id: 2, title: type === 'hira' ? 'Hazard ID' : type === 'eaa' ? 'Aspect ID' : 'Risk ID' },
    { id: 3, title: 'Risk Assessment' },
    { id: 4, title: 'Control Measures' },
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = () => {
    const payload: any = {
      department: formData.department,
      items: formData.items,
    };

    if (type === 'hira') {
      payload.activity = formData.name;
      payload.task = formData.task;
      payload.location = formData.location;
      payload.identificationDate = formData.date;
    } else if (type === 'eaa') {
      payload.process = formData.name;
      payload.area = formData.location;
    } else if (type === 'qra') {
      payload.riskCategory = formData.name;
      payload.process = formData.location;
    }

    onSubmit(payload);
  };

  const standardRef = {
    hira: 'ISO 45001:2018',
    eaa: 'ISO 14001:2015',
    qra: 'ISO 9001:2015',
  };

  const isoText = {
    hira: 'Clause 6.1.2.1: The organization shall establish, implement and maintain a process for hazard identification that is ongoing and proactive.',
    eaa: 'Clause 6.1.2: The organization shall determine the environmental aspects of its activities, products and services that it can control and those that it can influence.',
    qra: 'Clause 6.1: When planning for the quality management system, the organization shall consider the issues referred to in 4.1 and the requirements referred to in 4.2 and determine the risks and opportunities.',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">New {type.toUpperCase()} Assessment</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Step {step} of 4: {steps.find(s => s.id === step)?.title}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-all border border-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-100 overflow-hidden shrink-0">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50/10">
          <div className="max-w-2xl mx-auto space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Evaluation Title *</label>
                  <input 
                    type="text"
                    placeholder={type === 'hira' ? 'e.g., Warehouse Forklift Ops' : type === 'eaa' ? 'e.g., Chemical Storage Audit' : 'e.g., Raw Material Sourcing'}
                    className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Department *</label>
                    <select 
                      className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 appearance-none bg-no-repeat bg-[right_1.5rem_center] shadow-sm"
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                    >
                      <option value="">Select Dept</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Date</label>
                    <input 
                      type="date"
                      className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 shadow-sm"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    {type === 'hira' ? 'Task / Process Description *' : 'Process / Area Location *'}
                  </label>
                  <input 
                    type="text"
                    placeholder={type === 'hira' ? "e.g., Working at height" : "e.g., Production Line 4"}
                    className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                    value={type === 'hira' ? formData.task : formData.location}
                    onChange={e => setFormData({...formData, [type === 'hira' ? 'task' : 'location']: e.target.value})}
                  />
                </div>

                {type === 'hira' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Location / Area *</label>
                    <input 
                      type="text"
                      className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 shadow-sm"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                )}

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{standardRef[type]} Requirement</p>
                      <p className="text-[8px] text-blue-400 font-medium leading-tight max-w-[300px] mt-0.5">{isoText[type].substring(0, 100)}...</p>
                    </div>
                  </div>
                  <button 
                    onClick={addItem}
                    className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100 hover:bg-blue-50 transition-all shadow-sm"
                  >
                    + Add Item
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Identify {type === 'hira' ? 'Hazards' : type === 'eaa' ? 'Aspects' : 'Failure Modes'}</h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold tabular-nums">{formData.items.length} ITEMS</span>
                </div>
                
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm space-y-4 relative group">
                      {formData.items.length > 1 && (
                        <button 
                          onClick={() => removeItem(index)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-50 z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hazard Description</span>
                      </div>

                      <div className="space-y-4">
                        {/* Sub-Activity field */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest px-1 flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 inline-block"></span>
                            Sub-Activity
                            <span className="text-amber-400 font-semibold normal-case tracking-normal">(which step triggers this hazard?)</span>
                          </label>
                          <input
                            type="text"
                            placeholder={type === 'hira' ? 'e.g., Overhead welding on mezzanine level' : type === 'eaa' ? 'e.g., Chemical drum decanting' : 'e.g., Incoming raw material inspection'}
                            className="w-full px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-100 outline-none font-bold text-slate-800 text-sm placeholder:text-amber-300"
                            value={item.subActivity || ''}
                            onChange={e => updateItem(index, 'subActivity', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <textarea 
                            rows={2}
                            placeholder="Describe the hazard/aspect..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 text-sm italic"
                            value={item.hazardOrAspect}
                            onChange={e => updateItem(index, 'hazardOrAspect', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Consequent Impact/Risk</p>
                          <textarea 
                            rows={2}
                            placeholder="Describe the potential consequence..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 text-sm italic"
                            value={item.consequenceOrImpact}
                            onChange={e => updateItem(index, 'consequenceOrImpact', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={addItem}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  + Add Another Entry
                </button>
              </div>
            )}

            {(step === 3 || step === 4) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                    {step === 3 ? 'Risk Assessment' : 'Mitigation & Target'}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Item {formData.items.length > 0 ? '1' : '0'} of {formData.items.length}</span>
                </div>

                <div className="space-y-6">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm space-y-6">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider line-clamp-1">{item.hazardOrAspect || 'Unnamed Item'}</span>
                      </div>

                      {step === 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Likelihood (L)</p>
                            <div className="flex justify-center gap-1.5">
                              {[1,2,3,4,5].map(n => (
                                <button 
                                  key={n}
                                  onClick={() => updateItem(index, 'likelihood', n)}
                                  className={`w-8 h-8 rounded-lg font-bold text-xs transition-all ${item.likelihood === n ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-100 text-slate-400 hover:bg-white'}`}
                                >{n}</button>
                              ))}
                            </div>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Severity (S)</p>
                            <div className="flex justify-center gap-1.5">
                              {[1,2,3,4,5].map(n => (
                                <button 
                                  key={n}
                                  onClick={() => updateItem(index, 'severity', n)}
                                  className={`w-8 h-8 rounded-lg font-bold text-xs transition-all ${item.severity === n ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-100 text-slate-400 hover:bg-white'}`}
                                >{n}</button>
                              ))}
                            </div>
                          </div>
                          <div className="col-span-full flex items-center justify-between bg-slate-900 rounded-xl p-3 px-5 text-white">
                            <span className="text-[10px] font-bold uppercase">Exposure Score</span>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                item.likelihood * item.severity >= 17 ? 'border-red-500 text-red-500' :
                                item.likelihood * item.severity >= 10 ? 'border-orange-500 text-orange-500' :
                                item.likelihood * item.severity >= 5 ? 'border-yellow-500 text-yellow-500' : 'border-green-500 text-green-500'
                              }`}>
                                {item.likelihood * item.severity >= 17 ? 'Critical' :
                                 item.likelihood * item.severity >= 10 ? 'High' :
                                 item.likelihood * item.severity >= 5 ? 'Medium' : 'Low'}
                              </span>
                              <span className="text-xl font-bold tabular-nums">{item.likelihood * item.severity}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {step === 4 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Existing Controls</label>
                               <textarea 
                                 rows={2}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium"
                                 value={item.currentControls}
                                 onChange={e => updateItem(index, 'currentControls', e.target.value)}
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Proposed Actions</label>
                               <textarea 
                                 rows={2}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium"
                                 value={item.proposedActions}
                                 onChange={e => updateItem(index, 'proposedActions', e.target.value)}
                               />
                            </div>
                          </div>
                          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Residual Target L×S</span>
                            <div className="flex gap-2">
                              <select 
                                className="bg-white border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600"
                                value={item.residualLikelihood}
                                onChange={e => updateItem(index, 'residualLikelihood', parseInt(e.target.value))}
                              >
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                              <select 
                                className="bg-white border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600"
                                value={item.residualSeverity}
                                onChange={e => updateItem(index, 'residualSeverity', parseInt(e.target.value))}
                              >
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                              <div className="w-10 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg font-bold text-xs">
                                {item.residualLikelihood * item.residualSeverity}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
          <button 
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              step === 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50 border border-slate-100 shadow-sm'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            BACK
          </button>
          
          <div className="flex gap-3">
             <button 
               onClick={onClose}
               className="px-6 py-2.5 text-[11px] font-bold text-slate-400 hover:text-slate-600"
             >CANCEL</button>
             <button 
               onClick={step === 4 ? handleSubmit : handleNext}
               className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all shadow-md shadow-slate-200 min-w-[140px] justify-center"
             >
               {step === 4 ? (
                 <><Save className="w-4 h-4" /> FINALIZE RECORD</>
               ) : (
                 <>CONTINUE <ChevronRight className="w-4 h-4" /></>
               )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewActivityForm;
