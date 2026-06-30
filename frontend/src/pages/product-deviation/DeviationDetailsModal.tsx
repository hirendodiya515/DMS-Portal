import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { X, Save, CheckCircle, Clock, Trash2, FileText, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deviationId: string | null;
  isNew: boolean;
}

export function DeviationDetailsModal({ isOpen, onClose, deviationId, isNew }: Props) {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [deviation, setDeviation] = useState<any>(null);
  
  // Form states for NEW deviation
  const [formData, setFormData] = useState({
    line: '',
    startDate: '',
    endDate: '',
    totalQuantityProduced: 0,
    quantityUnderDeviation: 0,
    quantityUnderDeviationPcs: '' as string | number,
    natureOfDeviation: '',
    detailsOfDeviation: '',
    responsiblePersonIds: [] as string[]
  });

  // Action states for Responsibles
  const [actionData, setActionData] = useState({
    rootCauseAnalysis: '',
    containmentAction: '',
    correctiveAction: '',
    disposalAction: ''
  });

  // Marketing & Head states
  const [marketingRemark, setMarketingRemark] = useState('');
  const [plantHeadRemark, setPlantHeadRemark] = useState('');
  const [qualityHeadRemark, setQualityHeadRemark] = useState('');
  const [ceoRemark, setCeoRemark] = useState('');

  // Attachment states for each approval step
  const [marketingAttachments, setMarketingAttachments] = useState<any[]>([]);
  const [plantHeadAttachments, setPlantHeadAttachments] = useState<any[]>([]);
  const [ceoAttachments, setCeoAttachments] = useState<any[]>([]);
  const [qualityHeadAttachments, setQualityHeadAttachments] = useState<any[]>([]);
  const [actionPlanAttachments, setActionPlanAttachments] = useState<any[]>([]);

  const handleActionPlanAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setActionPlanAttachments(prev => [...prev, { name: file.name, fileData: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleMarketingAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMarketingAttachments(prev => [...prev, { name: file.name, fileData: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handlePlantHeadAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlantHeadAttachments(prev => [...prev, { name: file.name, fileData: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleCeoAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCeoAttachments(prev => [...prev, { name: file.name, fileData: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleQualityHeadAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQualityHeadAttachments(prev => [...prev, { name: file.name, fileData: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const downloadAttachment = (file: { name: string; fileData: string }) => {
    const link = document.createElement('a');
    link.href = file.fileData;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Settings context
  const [marketingConfigId, setMarketingConfigId] = useState<string | null>(null);
  const [plantHeadConfigId, setPlantHeadConfigId] = useState<string | null>(null);
  const [ceoConfigId, setCeoConfigId] = useState<string | null>(null);
  const [qualityHeadConfigId, setQualityHeadConfigId] = useState<string | null>(null);
  const [lineOptions, setLineOptions] = useState<string[]>(['Line 1', 'Line 2', 'Line 3']);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isNew) fetchUsers();
      if (!isNew && deviationId) fetchDeviationDetails();
      fetchSettings();
    }
  }, [isOpen, deviationId, isNew]);

  const fetchSettings = async () => {
    try {
      const [mRes, pRes, qRes, lRes, cRes] = await Promise.all([
        api.get('/settings/product_deviation_marketing_person'),
        api.get('/settings/product_deviation_plant_head'),
        api.get('/settings/product_deviation_quality_head'),
        api.get('/settings/product_deviation_lines'),
        api.get('/settings/product_deviation_ceo').catch(() => ({ data: null }))
      ]);
      setMarketingConfigId(mRes.data);
      setPlantHeadConfigId(pRes.data);
      setQualityHeadConfigId(qRes.data);
      setCeoConfigId(cRes?.data || null);
      if (lRes.data) {
        setLineOptions(lRes.data.split('\n').map((l: string) => l.trim()).filter(Boolean));
      }
    } catch (err) { }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) { }
  };

  const fetchDeviationDetails = async () => {
    try {
      const { data } = await api.get(`/product-deviation/${deviationId}`);
      setDeviation(data);
      setActionData({
        rootCauseAnalysis: data.rootCauseAnalysis || '',
        containmentAction: data.containmentAction || '',
        correctiveAction: data.correctiveAction || '',
        disposalAction: data.disposalAction || ''
      });
      setMarketingRemark(data.marketingRemarks || '');
      setPlantHeadRemark(data.plantHeadRemarks || '');
      setCeoRemark(data.ceoRemarks || '');
      setQualityHeadRemark(data.qualityHeadRemarks || '');
    } catch (err) { }
  };

  const handleCreate = async () => {
    if (formData.responsiblePersonIds.length === 0 || formData.responsiblePersonIds.length > 3) {
      alert('Please select between 1 and 3 responsible persons.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/product-deviation', {
        ...formData,
        totalQuantityProduced: Number(formData.totalQuantityProduced),
        quantityUnderDeviation: Number(formData.quantityUnderDeviation),
        quantityUnderDeviationPcs: formData.quantityUnderDeviationPcs !== '' ? Number(formData.quantityUnderDeviationPcs) : null
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error creating deviation');
    } finally {
      setLoading(false);
    }
  };

  const handleActionSign = async () => {
    setLoading(true);
    try {
      await api.put(`/product-deviation/${deviationId}/action`, {
        ...actionData,
        attachments: actionPlanAttachments
      });
      fetchDeviationDetails();
    } catch (err) {
      console.error(err);
      alert('Error saving action plan');
    } finally {
      setLoading(false);
    }
  };

  const handleMarketingSign = async () => {
    setLoading(true);
    try {
      await api.put(`/product-deviation/${deviationId}/marketing`, { 
        marketingRemarks: marketingRemark,
        attachments: marketingAttachments 
      });
      fetchDeviationDetails();
    } catch (err) {
      console.error(err);
      alert('Error adding marketing remarks');
    } finally {
      setLoading(false);
    }
  };

  const handlePlantHeadApprove = async () => {
    setLoading(true);
    try {
      await api.put(`/product-deviation/${deviationId}/plant-head`, { 
        plantHeadRemarks: plantHeadRemark,
        attachments: plantHeadAttachments 
      });
      fetchDeviationDetails();
    } catch (err) {
      console.error(err);
      alert('Error approving deviation');
    } finally {
      setLoading(false);
    }
  };

  const handleCeoApprove = async () => {
    setLoading(true);
    try {
      await api.put(`/product-deviation/${deviationId}/ceo`, { 
        ceoRemarks: ceoRemark,
        attachments: ceoAttachments 
      });
      fetchDeviationDetails();
    } catch (err) {
      console.error(err);
      alert('Error approving deviation');
    } finally {
      setLoading(false);
    }
  };

  const handleQualityHeadApprove = async () => {
    setLoading(true);
    try {
      await api.put(`/product-deviation/${deviationId}/quality-head`, { 
        qualityHeadRemarks: qualityHeadRemark,
        attachments: qualityHeadAttachments 
      });
      fetchDeviationDetails();
    } catch (err) {
      console.error(err);
      alert('Error finalizing deviation via Quality Head');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product deviation entry? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/product-deviation/${deviationId}`);
      alert('Product deviation deleted successfully.');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error deleting deviation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isResponsiblePerson = deviation?.responsiblePersons?.some((rp: any) => rp.userId === user?.id);
  const hasSignedAsResponsible = deviation?.responsiblePersons?.find((rp: any) => rp.userId === user?.id)?.signedAt;
  
  // Validating the current user against defined configured Defaults. If defined, they natively override ambient Admin roles.
  const isMarketingPerson = marketingConfigId ? user?.id === marketingConfigId : user?.role === 'admin';
  const isPlantHead = plantHeadConfigId ? user?.id === plantHeadConfigId : user?.role === 'admin';
  const isCeo = ceoConfigId ? user?.id === ceoConfigId : user?.role === 'admin';
  const isQualityHead = qualityHeadConfigId ? user?.id === qualityHeadConfigId : user?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800" id="modal-title">
            {isNew ? 'Create Product Deviation' : `Deviation Details: ${deviation?.serialNumber || ''}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
            <span className="sr-only">Close</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

            {isNew ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Line</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.line} onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                  >
                    <option value="">Select Line...</option>
                    {lineOptions.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Quantity Produced (sqm)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.totalQuantityProduced} onChange={(e) => setFormData({ ...formData, totalQuantityProduced: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Under Deviation (sqm)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.quantityUnderDeviation} onChange={(e) => setFormData({ ...formData, quantityUnderDeviation: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Under Deviation (pcs)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.quantityUnderDeviationPcs} onChange={(e) => setFormData({ ...formData, quantityUnderDeviationPcs: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nature of Deviation</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.natureOfDeviation} onChange={(e) => setFormData({ ...formData, natureOfDeviation: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Details of Deviation</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.detailsOfDeviation} onChange={(e) => setFormData({ ...formData, detailsOfDeviation: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsible Persons (Max 3)</label>
                  <select
                    multiple
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] custom-scrollbar"
                    value={formData.responsiblePersonIds}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions);
                      setFormData({ ...formData, responsiblePersonIds: options.map(o => o.value) });
                    }}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="py-1 px-2">{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">Hold Ctrl (or Cmd) to select multiple.</p>
                </div>
              </div>
            ) : deviation ? (
              <div className="space-y-6">
                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 grid grid-cols-2 gap-4 text-sm text-slate-700">
                  <div><span className="font-semibold text-slate-900">Line:</span> {deviation.line}</div>
                  <div><span className="font-semibold text-slate-900">Dates:</span> {new Date(deviation.startDate).toLocaleDateString()} to {new Date(deviation.endDate).toLocaleDateString()}</div>
                  <div><span className="font-semibold text-slate-900">Total Quantity Produced:</span> {deviation.totalQuantityProduced} sqm</div>
                  <div><span className="font-semibold text-slate-900">Quantity under Deviation:</span> {deviation.quantityUnderDeviation} sqm</div>
                  {deviation.quantityUnderDeviationPcs !== null && deviation.quantityUnderDeviationPcs !== undefined && (
                    <div><span className="font-semibold text-slate-900">Quantity under Deviation (pcs):</span> {deviation.quantityUnderDeviationPcs} pcs</div>
                  )}
                  <div className="col-span-2"><span className="font-semibold text-slate-900">Nature of Deviation:</span> {deviation.natureOfDeviation}</div>
                  <div className="col-span-2"><span className="font-semibold text-slate-900">Details:</span> {deviation.detailsOfDeviation}</div>
                  <div className="col-span-2 flex items-center">
                    <span className="font-semibold text-slate-900">Status:</span> 
                    <span className="ml-2 inline-flex items-center rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200">
                      {deviation.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Form Sections depending on Status & Role */}
                
                {deviation.status === 'OPEN' && isResponsiblePerson && !hasSignedAsResponsible && (
                  <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <h4 className="font-semibold text-slate-900 text-base mb-4">Action Plan (Responsible Person)</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Root Cause Analysis</label>
                        <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={actionData.rootCauseAnalysis} onChange={(e) => setActionData({ ...actionData, rootCauseAnalysis: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Containment Action</label>
                        <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={actionData.containmentAction} onChange={(e) => setActionData({ ...actionData, containmentAction: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Corrective Action</label>
                        <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={actionData.correctiveAction} onChange={(e) => setActionData({ ...actionData, correctiveAction: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Disposal Action</label>
                        <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={actionData.disposalAction} onChange={(e) => setActionData({ ...actionData, disposalAction: e.target.value })} />
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Optional Attachments</label>
                        <input type="file" multiple onChange={handleActionPlanAttachmentUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                        {actionPlanAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {actionPlanAttachments.map((f, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-xs text-slate-650">
                                {f.name}
                                <button type="button" onClick={() => setActionPlanAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={handleActionSign} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-blue-500/30 hover:bg-blue-700 flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save & Sign
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl shadow-sm text-sm text-slate-700">
                  <h4 className="font-semibold text-slate-900 text-base mb-4">Action Plans</h4>
                  {deviation.status !== 'OPEN' ? (
                    <>
                      <div><span className="font-semibold text-slate-900">Root Cause Analysis:</span> {deviation.rootCauseAnalysis || 'N/A'}</div>
                      <div className="mt-3"><span className="font-semibold text-slate-900">Containment Action:</span> {deviation.containmentAction || 'N/A'}</div>
                      <div className="mt-3"><span className="font-semibold text-slate-900">Corrective Action:</span> {deviation.correctiveAction || 'N/A'}</div>
                      <div className="mt-3"><span className="font-semibold text-slate-900">Disposal Action:</span> {deviation.disposalAction || 'N/A'}</div>
                      {deviation.actionPlanAttachments && deviation.actionPlanAttachments.length > 0 && (
                        <div className="mt-4">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Action Plan Attachments</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {deviation.actionPlanAttachments.map((file: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                                  <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                                </div>
                                <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-slate-50 text-slate-500 hover:text-orange-500 rounded border border-transparent hover:border-slate-200 cursor-pointer">
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="italic text-slate-500 mb-2">Awaiting action plans from responsible persons.</div>
                  )}
                  <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned Responsible Persons</span>
                    {deviation.responsiblePersons.map((rp: any) => (
                      <div key={rp.id} className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${rp.signedAt ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className="font-medium">{rp.user?.firstName} {rp.user?.lastName}</span>
                        {rp.signedAt ? <span className="text-slate-500 italic text-xs ml-auto">Signed on {new Date(rp.signedAt).toLocaleString()}</span> : <span className="text-amber-600 italic text-xs ml-auto">Pending Signature</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {deviation.status === 'PENDING_MARKETING' && isMarketingPerson && (
                  <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <h4 className="font-semibold text-slate-900 text-base mb-4">Marketing Remarks</h4>
                    <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" placeholder="Provide your remarks here..." value={marketingRemark} onChange={(e) => setMarketingRemark(e.target.value)} />
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Optional Attachments</label>
                      <input type="file" multiple onChange={handleMarketingAttachmentUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      {marketingAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {marketingAttachments.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-xs text-slate-650">
                              {f.name}
                              <button type="button" onClick={() => setMarketingAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={handleMarketingSign} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-blue-500/30 hover:bg-blue-700 flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save & Sign
                    </button>
                  </div>
                )}

                {deviation.status !== 'OPEN' && deviation.status !== 'PENDING_MARKETING' && deviation.marketingPersonId && (
                   <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl shadow-sm text-sm text-slate-700">
                     <h4 className="font-semibold text-slate-900 text-base mb-2">Marketing Remarks</h4>
                     <div className="bg-white border border-slate-200 rounded-lg p-4 italic text-slate-600">{deviation.marketingRemarks || 'No remarks provided.'}</div>
                     {deviation.marketingAttachments && deviation.marketingAttachments.length > 0 && (
                       <div className="mt-3">
                         <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Marketing Attachments</span>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           {deviation.marketingAttachments.map((file: any, index: number) => (
                             <div key={index} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                               <div className="flex items-center gap-2 min-w-0">
                                 <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                                 <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                               </div>
                               <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-slate-50 text-slate-500 hover:text-orange-500 rounded border border-transparent hover:border-slate-200 cursor-pointer">
                                 <Download className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                       <CheckCircle className="w-4 h-4 text-green-500" />
                       Signed by <span className="font-semibold">{deviation.marketingPerson?.firstName} {deviation.marketingPerson?.lastName}</span> on {deviation.marketingSignedAt && new Date(deviation.marketingSignedAt).toLocaleString()}
                     </div>
                   </div>
                )}

                {deviation.status === 'PENDING_PLANT_HEAD' && isPlantHead && (
                  <div className="bg-amber-50 p-5 border border-amber-200 rounded-xl shadow-sm">
                    <h4 className="font-semibold text-amber-900 text-base mb-4">Plant Head Approval</h4>
                    <p className="text-sm text-amber-700 mb-4">Please review the containment actions, corrective actions, and marketing remarks. Provide any final remarks before escalating to the Quality Head.</p>
                    <textarea rows={3} className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3" placeholder="Plant Head Remarks (optional)..." value={plantHeadRemark} onChange={(e) => setPlantHeadRemark(e.target.value)} />
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-amber-800 uppercase mb-1">Optional Attachments</label>
                      <input type="file" multiple onChange={handlePlantHeadAttachmentUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer" />
                      {plantHeadAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {plantHeadAttachments.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-amber-200 px-2 py-0.5 rounded-md text-xs text-amber-800">
                              {f.name}
                              <button type="button" onClick={() => setPlantHeadAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-amber-400 hover:text-amber-600 font-bold">&times;</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={handlePlantHeadApprove} disabled={loading} className="bg-amber-600 text-white px-5 py-2.5 rounded-lg transition shadow-lg shadow-amber-600/30 hover:bg-amber-700 flex items-center gap-2 font-medium">
                      <CheckCircle className="w-5 h-5" /> Approve & Send to Quality Head
                    </button>
                  </div>
                )}

                {deviation.status === 'PENDING_PLANT_HEAD' && isCeo && (
                  <div className="bg-amber-50 p-5 border border-amber-200 rounded-xl shadow-sm">
                     <h4 className="font-semibold text-amber-900 text-base mb-4">CEO Approval</h4>
                     <p className="text-sm text-amber-700 mb-4">Please review the containment actions, corrective actions, and marketing remarks. Provide any final remarks before escalating to the Quality Head.</p>
                     <textarea rows={3} className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3" placeholder="CEO Remarks (optional)..." value={ceoRemark} onChange={(e) => setCeoRemark(e.target.value)} />
                     <div className="mb-4">
                       <label className="block text-xs font-semibold text-amber-800 uppercase mb-1">Optional Attachments</label>
                       <input type="file" multiple onChange={handleCeoAttachmentUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-905 hover:file:bg-amber-200 cursor-pointer" />
                       {ceoAttachments.length > 0 && (
                         <div className="flex flex-wrap gap-2 mt-2">
                           {ceoAttachments.map((f, i) => (
                             <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-amber-200 px-2 py-0.5 rounded-md text-xs text-amber-800">
                               {f.name}
                               <button type="button" onClick={() => setCeoAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-amber-400 hover:text-amber-600 font-bold">&times;</button>
                             </span>
                           ))}
                         </div>
                       )}
                     </div>
                     <button onClick={handleCeoApprove} disabled={loading} className="bg-amber-600 text-white px-5 py-2.5 rounded-lg transition shadow-lg shadow-amber-600/30 hover:bg-amber-700 flex items-center gap-2 font-medium">
                       <CheckCircle className="w-5 h-5" /> Approve & Send to Quality Head
                     </button>
                  </div>
                )}

                {deviation.plantHeadId && (
                    <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl shadow-sm text-sm text-slate-700">
                      <h4 className="font-semibold text-slate-900 text-base mb-2">Plant Head Remarks</h4>
                      <div className="bg-white border border-slate-200 rounded-lg p-4 italic text-slate-600">{deviation.plantHeadRemarks || 'No remarks provided.'}</div>
                      {deviation.plantHeadAttachments && deviation.plantHeadAttachments.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Plant Head Attachments</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {deviation.plantHeadAttachments.map((file: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                                  <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                                </div>
                                <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-slate-50 text-slate-500 hover:text-orange-500 rounded border border-transparent hover:border-slate-200 cursor-pointer">
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Approved by <span className="font-semibold">{deviation.plantHead?.firstName} {deviation.plantHead?.lastName}</span> on {deviation.plantHeadSignedAt && new Date(deviation.plantHeadSignedAt).toLocaleString()}
                      </div>
                    </div>
                )}

                {deviation.ceoId && (
                    <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl shadow-sm text-sm text-slate-700">
                      <h4 className="font-semibold text-slate-900 text-base mb-2">CEO Remarks</h4>
                      <div className="bg-white border border-slate-200 rounded-lg p-4 italic text-slate-600">{deviation.ceoRemarks || 'No remarks provided.'}</div>
                      {deviation.ceoAttachments && deviation.ceoAttachments.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">CEO Attachments</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {deviation.ceoAttachments.map((file: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                                  <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                                </div>
                                <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-slate-50 text-slate-500 hover:text-orange-500 rounded border border-transparent hover:border-slate-200 cursor-pointer">
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Approved by <span className="font-semibold">{deviation.ceo?.firstName} {deviation.ceo?.lastName}</span> on {deviation.ceoSignedAt && new Date(deviation.ceoSignedAt).toLocaleString()}
                      </div>
                    </div>
                )}

                {deviation.status === 'PENDING_QUALITY_HEAD' && isQualityHead && (
                  <div className="bg-emerald-50 p-5 border border-emerald-200 rounded-xl shadow-sm">
                    <h4 className="font-semibold text-emerald-900 text-base mb-4">Quality Head Final Approval</h4>
                    <p className="text-sm text-emerald-700 mb-4">You are the final approver in this flow. Please provide any conclusive remarks and click approve to completely close this deviation record.</p>
                    <textarea rows={3} className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3" placeholder="Quality Head Remarks (optional)..." value={qualityHeadRemark} onChange={(e) => setQualityHeadRemark(e.target.value)} />
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-emerald-800 uppercase mb-1">Optional Attachments</label>
                      <input type="file" multiple onChange={handleQualityHeadAttachmentUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-850 hover:file:bg-emerald-200 cursor-pointer" />
                      {qualityHeadAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {qualityHeadAttachments.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-emerald-200 px-2 py-0.5 rounded-md text-xs text-emerald-800">
                              {f.name}
                              <button type="button" onClick={() => setQualityHeadAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-emerald-450 hover:text-emerald-600 font-bold">&times;</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={handleQualityHeadApprove} disabled={loading} className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg transition shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 flex items-center gap-2 font-medium">
                      <CheckCircle className="w-5 h-5" /> Finalize & Close Deviation
                    </button>
                  </div>
                )}

                {deviation.status === 'CLOSED' && (
                  <div className="bg-emerald-50 p-5 border border-emerald-200 rounded-xl shadow-sm text-sm">
                    <h4 className="font-semibold text-emerald-800 text-base mb-2 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Final Approval Completed (Quality Head)</h4>
                    {deviation.qualityHeadRemarks && (
                       <div className="bg-white border border-emerald-100 rounded-lg p-4 italic text-emerald-800 mt-2 mb-3">{deviation.qualityHeadRemarks}</div>
                    )}
                    {deviation.qualityHeadAttachments && deviation.qualityHeadAttachments.length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1.5">Quality Head Attachments</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {deviation.qualityHeadAttachments.map((file: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white border border-emerald-100 rounded-lg text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-emerald-650 shrink-0" />
                                <span className="font-bold text-emerald-800 truncate max-w-[200px]">{file.name}</span>
                              </div>
                              <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 rounded border border-transparent hover:border-emerald-100 cursor-pointer">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-emerald-700 mt-2">Approved by Quality Head (<span className="font-semibold">{deviation.qualityHead?.firstName} {deviation.qualityHead?.lastName}</span>) on {deviation.qualityHeadSignedAt && new Date(deviation.qualityHeadSignedAt).toLocaleString()}</p>
                  </div>
                )}

                {/* Audit Trail Section */}
                <div className="mt-8 border-t border-slate-200 pt-6">
                  <h4 className="font-semibold text-slate-800 text-base mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Audit Trail
                  </h4>
                  <div className="flow-root">
                    <ul role="list" className="-mb-8">
                      {deviation.auditLogs?.map((log: any, logIdx: number) => (
                        <li key={log.id}>
                          <div className="relative pb-8">
                            {logIdx !== deviation.auditLogs.length - 1 ? (
                              <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex items-start space-x-3">
                              <div>
                                <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white shadow-sm ${
                                  log.action.includes('CREATE') ? 'bg-blue-100 text-blue-600' :
                                  log.action.includes('SIGN') || log.action.includes('APPROVE') ? 'bg-emerald-100 text-emerald-600' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {log.action.includes('SIGN') || log.action.includes('APPROVE') ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-2">
                                <div>
                                  <p className="text-sm text-slate-600">
                                    {log.details || log.action.replace(/_/g, ' ')}{' '}
                                    <span className="font-semibold text-slate-900">
                                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                                    </span>
                                  </p>
                                </div>
                                <div className="whitespace-nowrap text-right text-sm text-slate-500">
                                  {new Date(log.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                      {(!deviation.auditLogs || deviation.auditLogs.length === 0) && (
                        <li className="text-sm text-slate-500 italic pb-8 pl-4">No audit logs found.</li>
                      )}
                    </ul>
                  </div>
                </div>

              </div>
            ) : (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p>Loading details...</p>
                </div>
            )}
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center shrink-0">
            <div>
              {!isNew && user?.role === 'admin' && (
                <button
                  type="button"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-lg shadow-red-500/20 font-medium flex items-center gap-2"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                  {loading ? 'Deleting...' : 'Delete Deviation'}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
                onClick={onClose}
              >
                {isNew ? 'Cancel' : 'Close'}
              </button>
              {isNew && (
                <button
                  type="button"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-lg shadow-blue-500/30 flex items-center justify-center font-medium disabled:opacity-50"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Deviation'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
