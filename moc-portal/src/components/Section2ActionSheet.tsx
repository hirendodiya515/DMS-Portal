import { Plus, Trash2, Paperclip } from 'lucide-react';

const DynamicTable = ({ title, columns, data, onAdd, onRemove, onUpdate, readOnly }: any) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {!readOnly && (
          <button 
            type="button"
            onClick={onAdd}
            className="flex items-center text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded border border-brand-100 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Row
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12 text-center">Sl.No</th>
              {columns.map((col: string) => (
                <th key={col} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{col}</th>
              ))}
              {!readOnly && <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (readOnly ? 1 : 2)} className="px-3 py-6 text-center text-xs text-slate-400 italic">No records added yet</td>
              </tr>
            ) : (
              data.map((row: any, idx: number) => (
                <tr key={idx} className="group hover:bg-slate-50/50">
                  <td className="px-3 py-1.5 text-center text-xs font-semibold text-slate-500">{idx + 1}</td>
                  {columns.map((col: string) => {
                    if (col.toLowerCase() === 'attachment') {
                      const fileObj = row[col];
                      return (
                        <td key={col} className="px-3 py-1.5">
                          {fileObj?.name ? (
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2 py-0.5 max-w-[180px] shadow-sm">
                              <span 
                                className="text-[10px] text-brand-600 font-semibold truncate cursor-pointer hover:underline max-w-[130px]"
                                title="Click to view attachment"
                                onClick={() => {
                                  const win = window.open();
                                  if (win) {
                                    win.document.write(`<iframe src="${fileObj.base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  }
                                }}
                              >
                                {fileObj.name}
                              </span>
                              {!readOnly && (
                                <button 
                                  type="button"
                                  onClick={() => onUpdate(idx, col, null)}
                                  className="text-slate-400 hover:text-red-500 ml-1.5 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            !readOnly ? (
                              <label className="flex items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded px-2.5 py-0.5 cursor-pointer transition-all shadow-sm max-w-[90px]">
                                <Paperclip className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500">Upload</span>
                                <input 
                                  type="file" 
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      onUpdate(idx, col, {
                                        name: file.name,
                                        type: file.type,
                                        base64: reader.result
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No file</span>
                            )
                          )}
                        </td>
                      );
                    }
                    const isDateField = col.toLowerCase().includes('date');
                    return (
                      <td key={col} className="px-3 py-1.5">
                        <input 
                          type={isDateField ? 'date' : 'text'}
                          value={row[col] || ''}
                          disabled={readOnly}
                          onChange={(e) => onUpdate(idx, col, e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-brand-500 rounded px-2 py-1 outline-none text-xs text-slate-600 disabled:opacity-90"
                          placeholder="..."
                        />
                      </td>
                    );
                  })}
                  {!readOnly && (
                    <td className="px-3 py-1.5 text-right">
                      <button 
                        type="button"
                        onClick={() => onRemove(idx)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Section2ActionSheet = ({ data, update, readOnly }: any) => {
  const handleAdd = (table: string, emptyRow: any) => {
    update((prev: any) => ({ ...prev, [table]: [...(prev[table] || []), emptyRow] }));
  };

  const handleRemove = (table: string, idx: number) => {
    update((prev: any) => ({ ...prev, [table]: prev[table].filter((_: any, i: number) => i !== idx) }));
  };

  const handleUpdate = (table: string, idx: number, col: string, val: any) => {
    update((prev: any) => {
      const newList = [...prev[table]];
      newList[idx] = { ...newList[idx], [col]: val };
      return { ...prev, [table]: newList };
    });
  };

  const handleAddAction = (qIdx: number) => {
    update((prev: any) => {
      const actionPlan = [...(prev.actionPlan || [])];
      if (!actionPlan[qIdx]) return prev;
      
      const actions = [...(actionPlan[qIdx].actions || [])];
      const newId = `${qIdx + 1}-${actions.length + 1}`;
      
      actionPlan[qIdx] = {
        ...actionPlan[qIdx],
        actions: [...actions, { id: newId, text: '', targetDate: '', completedDate: '', responsibility: '' }]
      };
      return { ...prev, actionPlan };
    });
  };

  const handleRemoveAction = (qIdx: number, aIdx: number) => {
    update((prev: any) => {
      const actionPlan = [...(prev.actionPlan || [])];
      if (!actionPlan[qIdx]) return prev;
      
      const actions = (actionPlan[qIdx].actions || []).filter((_: any, idx: number) => idx !== aIdx);
      actionPlan[qIdx] = { ...actionPlan[qIdx], actions };
      return { ...prev, actionPlan };
    });
  };

  const handleActionUpdate = (qIdx: number, aIdx: number, field: string, val: string) => {
    update((prev: any) => {
      const actionPlan = [...(prev.actionPlan || [])];
      if (!actionPlan[qIdx]) return prev;
      
      const actions = [...(actionPlan[qIdx].actions || [])];
      if (actions[aIdx]) {
        actions[aIdx] = { ...actions[aIdx], [field]: val };
      }
      actionPlan[qIdx] = { ...actionPlan[qIdx], actions };
      return { ...prev, actionPlan };
    });
  };

  const handleToggleApplicable = (qIdx: number, val: boolean) => {
    update((prev: any) => {
      const actionPlan = [...(prev.actionPlan || [])];
      if (!actionPlan[qIdx]) return prev;
      
      actionPlan[qIdx] = {
        ...actionPlan[qIdx],
        applicable: val
      };
      return { ...prev, actionPlan };
    });
  };

  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="space-y-6">
        {/* 1. Action Plan Details (Custom Nested Cards) */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3">1. Action Plan Details</h3>
          <div className="space-y-4">
            {(data.actionPlan || []).map((item: any, qIdx: number) => (
              <div key={item.id || qIdx} className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm hover:shadow-md transition-all duration-200 space-y-3">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex gap-2.5">
                    <span className="font-bold text-slate-400 text-xs shrink-0 mt-0.5">{qIdx + 1}.</span>
                    <p className="font-semibold text-slate-800 text-xs whitespace-normal leading-relaxed break-words">{item.description || item.Description || ''}</p>
                  </div>
                  
                  {/* Switch Selector */}
                  <div className={`flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-sm ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
                    <button 
                      type="button"
                      onClick={() => handleToggleApplicable(qIdx, true)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                        item.applicable 
                          ? 'bg-brand-500 border-brand-500 text-white shadow-sm' 
                          : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Applicable
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleToggleApplicable(qIdx, false)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                        !item.applicable 
                          ? 'bg-slate-300 border-slate-300 text-slate-700 shadow-sm' 
                          : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Not Applicable
                    </button>
                  </div>
                </div>
                
                {item.applicable && (
                  <div className="overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/50 p-2 mt-2 transition-all duration-300">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                          <th className="px-2 py-1">Actions Required</th>
                          <th className="px-2 py-1 w-32">Target Date</th>
                          <th className="px-2 py-1 w-32">Completed Date</th>
                          <th className="px-2 py-1 w-40">Responsibility</th>
                          {!readOnly && <th className="w-8"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(item.actions || []).map((act: any, aIdx: number) => (
                          <tr key={act.id || aIdx} className="hover:bg-slate-100/30">
                            <td className="px-2 py-1.5">
                              <input 
                                type="text" 
                                value={act.text || ''}
                                disabled={readOnly}
                                onChange={(e) => handleActionUpdate(qIdx, aIdx, 'text', e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-brand-500 rounded px-2.5 py-1 outline-none text-xs text-slate-600 shadow-sm"
                                placeholder="Describe action required..."
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input 
                                type="date" 
                                value={act.targetDate || ''}
                                disabled={readOnly}
                                onChange={(e) => handleActionUpdate(qIdx, aIdx, 'targetDate', e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-brand-500 rounded px-2 py-1 outline-none text-xs text-slate-600 shadow-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input 
                                type="date" 
                                value={act.completedDate || ''}
                                disabled={readOnly}
                                onChange={(e) => handleActionUpdate(qIdx, aIdx, 'completedDate', e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-brand-500 rounded px-2 py-1 outline-none text-xs text-slate-600 shadow-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input 
                                type="text" 
                                value={act.responsibility || ''}
                                disabled={readOnly}
                                onChange={(e) => handleActionUpdate(qIdx, aIdx, 'responsibility', e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-brand-500 rounded px-2.5 py-1 outline-none text-xs text-slate-600 shadow-sm"
                                placeholder="Responsible person..."
                              />
                            </td>
                            {!readOnly && (
                              <td className="px-2 py-1.5 text-center">
                                {(item.actions || []).length > 1 && (
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveAction(qIdx, aIdx)}
                                    className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer animate-in fade-in"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {!readOnly && (
                      <div className="mt-2 flex justify-start">
                        <button 
                          type="button"
                          onClick={() => handleAddAction(qIdx)}
                          className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded border border-brand-100 transition-all shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Add Action Item
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. Details of Trial */}
        <DynamicTable 
          title="2. Details of Trial"
          columns={['Description', 'Observation', 'Result', 'Date', 'Attachment']}
          data={data.trialDetails || []}
          onAdd={() => handleAdd('trialDetails', { Description: '', Observation: '', Result: '', Date: '', Attachment: null })}
          onRemove={(idx: number) => handleRemove('trialDetails', idx)}
          onUpdate={(idx: number, col: string, val: any) => handleUpdate('trialDetails', idx, col, val)}
          readOnly={readOnly}
        />

        {/* 3. Affected Documented Information */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3">3. Affected Documented Information</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12 text-center">Sl.No</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descriptions</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32 text-center">Applicability</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-36">Target Date</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-36">Status</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-64">Doc Reference / Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(data.affectedDocs || []).map((item: any, idx: number) => {
                  const isGhost = !item.applicable;
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 text-center text-xs font-semibold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 text-xs">
                        {item.isCustom ? (
                          <input 
                            type="text" 
                            value={item.description || ''}
                            disabled={readOnly}
                            onChange={(e) => handleUpdate('affectedDocs', idx, 'description', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-brand-500 rounded px-2.5 py-1 outline-none text-xs text-slate-600 shadow-sm"
                            placeholder="Specify custom document..."
                          />
                        ) : (
                          <p className="font-semibold text-slate-800 leading-relaxed whitespace-normal break-words">{item.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className={`flex items-center justify-center gap-1.5 ${readOnly ? 'pointer-events-none opacity-85' : ''}`}>
                          <button 
                            type="button"
                            onClick={() => handleUpdate('affectedDocs', idx, 'applicable', true)}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              item.applicable 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Yes
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              handleUpdate('affectedDocs', idx, 'applicable', false);
                              // Clear fields when marking as not applicable
                              handleUpdate('affectedDocs', idx, 'targetDate', '');
                              handleUpdate('affectedDocs', idx, 'status', '');
                              handleUpdate('affectedDocs', idx, 'docReference', '');
                            }}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              !item.applicable 
                                ? 'bg-slate-100 border-slate-300 text-slate-600 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="date" 
                          value={item.targetDate || ''}
                          disabled={isGhost || readOnly}
                          onChange={(e) => handleUpdate('affectedDocs', idx, 'targetDate', e.target.value)}
                          className={`w-full bg-white border border-slate-200 focus:ring-1 focus:ring-brand-500 rounded px-2 py-1 outline-none text-xs text-slate-600 shadow-sm transition-all duration-200 ${
                            isGhost ? 'opacity-30 bg-slate-50 cursor-not-allowed pointer-events-none select-none' : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select 
                          value={item.status || ''}
                          disabled={isGhost || readOnly}
                          onChange={(e) => handleUpdate('affectedDocs', idx, 'status', e.target.value)}
                          className={`w-full bg-white border border-slate-200 focus:ring-1 focus:ring-brand-500 rounded px-2 py-1 outline-none text-xs text-slate-600 shadow-sm transition-all duration-200 ${
                            isGhost ? 'opacity-30 bg-slate-50 cursor-not-allowed pointer-events-none select-none' : ''
                          }`}
                        >
                          <option value="">Select...</option>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="text" 
                          value={item.docReference || ''}
                          disabled={isGhost || readOnly}
                          onChange={(e) => handleUpdate('affectedDocs', idx, 'docReference', e.target.value)}
                          className={`w-full bg-white border border-slate-200 focus:ring-1 focus:ring-brand-500 rounded px-2.5 py-1 outline-none text-xs text-slate-600 shadow-sm transition-all duration-200 ${
                            isGhost ? 'opacity-30 bg-slate-50 cursor-not-allowed pointer-events-none select-none' : ''
                          }`}
                          placeholder="Ref details / approval details..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </fieldset>
  );
};

export default Section2ActionSheet;
