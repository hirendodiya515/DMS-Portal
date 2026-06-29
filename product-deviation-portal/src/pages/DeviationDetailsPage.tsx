import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Save, FileText, Loader2, AlertCircle, ShieldAlert, Download } from 'lucide-react';
import api from '../api';
import { generateDeviationPdf } from '../utils/generateDeviationPdf';
import { formatDate, formatDateTime } from '../utils/dateFormatter';

export default function DeviationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deviation, setDeviation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Current logged in user context
  const userString = localStorage.getItem('pd_user');
  const user = userString ? JSON.parse(userString) : null;

  // Config settings
  const [marketingConfigId, setMarketingConfigId] = useState<string | null>(null);
  const [plantHeadConfigId, setPlantHeadConfigId] = useState<string | null>(null);
  const [qualityHeadConfigId, setQualityHeadConfigId] = useState<string | null>(null);
  const [ceoConfigId, setCeoConfigId] = useState<string | null>(null);

  // Form states for actions and remarks
  const [actionData, setActionData] = useState({
    rootCauseAnalysis: '',
    containmentAction: '',
    correctiveAction: '',
    disposalAction: ''
  });
  const [marketingRemark, setMarketingRemark] = useState('');
  const [plantHeadRemark, setPlantHeadRemark] = useState('');
  const [ceoRemark, setCeoRemark] = useState('');
  const [qualityHeadRemark, setQualityHeadRemark] = useState('');

  const downloadAttachment = (file: { name: string; fileData: string }) => {
    const link = document.createElement('a');
    link.href = file.fileData;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (id) {
      fetchDeviationDetails();
      fetchConfigs();
    }
  }, [id]);

  const fetchConfigs = async () => {
    try {
      const [mRes, pRes, qRes, cRes] = await Promise.all([
        api.get('/settings/product_deviation_marketing_person').catch(() => ({ data: null })),
        api.get('/settings/product_deviation_plant_head').catch(() => ({ data: null })),
        api.get('/settings/product_deviation_quality_head').catch(() => ({ data: null })),
        api.get('/settings/product_deviation_ceo').catch(() => ({ data: null }))
      ]);
      setMarketingConfigId(mRes.data);
      setPlantHeadConfigId(pRes.data);
      setQualityHeadConfigId(qRes.data);
      setCeoConfigId(cRes.data);
    } catch (err) {
      console.error('Failed to load portal configuration settings:', err);
    }
  };

  const fetchDeviationDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/product-deviation/${id}`);
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
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch details for this deviation record.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionSign = async () => {
    if (!actionData.rootCauseAnalysis.trim() || !actionData.containmentAction.trim() || !actionData.correctiveAction.trim() || !actionData.disposalAction.trim()) {
      alert('Please fill out all action fields before signing.');
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/product-deviation/${id}/action`, actionData);
      await fetchDeviationDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error saving action plan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarketingSign = async () => {
    if (!marketingRemark.trim()) {
      alert('Please enter remarks before signing.');
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/product-deviation/${id}/marketing`, { marketingRemarks: marketingRemark });
      await fetchDeviationDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error adding marketing remarks.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlantHeadApprove = async () => {
    setActionLoading(true);
    try {
      await api.put(`/product-deviation/${id}/plant-head`, { plantHeadRemarks: plantHeadRemark });
      await fetchDeviationDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error approving deviation record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCeoApprove = async () => {
    setActionLoading(true);
    try {
      await api.put(`/product-deviation/${id}/ceo`, { ceoRemarks: ceoRemark });
      await fetchDeviationDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error approving deviation record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQualityHeadApprove = async () => {
    setActionLoading(true);
    try {
      await api.put(`/product-deviation/${id}/quality-head`, { qualityHeadRemarks: qualityHeadRemark });
      await fetchDeviationDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error finalizing deviation record.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !deviation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Error Occurred</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!deviation) return null;

  const isResponsiblePerson = deviation.responsiblePersons?.some((rp: any) => rp.userId === user?.id);
  const hasSignedAsResponsible = deviation.responsiblePersons?.find((rp: any) => rp.userId === user?.id)?.signedAt;
  
  const isMarketingPerson = marketingConfigId ? user?.id === marketingConfigId : user?.role === 'admin';
  const isPlantHead = plantHeadConfigId ? user?.id === plantHeadConfigId : user?.role === 'admin';
  const isCeo = ceoConfigId ? user?.id === ceoConfigId : user?.role === 'admin';
  const isQualityHead = qualityHeadConfigId ? user?.id === qualityHeadConfigId : user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all border border-slate-100 cursor-pointer mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img src="/logo.png" alt="Borosil Logo" className="h-10 w-auto object-contain" />
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight">Deviation: {deviation.serialNumber}</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Line: {deviation.line}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deviation.status === 'CLOSED' && (
              <button
                onClick={() => generateDeviationPdf(deviation)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-100 font-bold text-sm cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-4xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Basic Information card */}
        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Basic Specification</h3>
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
              deviation.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' :
              deviation.status === 'OPEN' ? 'bg-rose-50 text-rose-700 ring-rose-600/10' :
              'bg-amber-50 text-amber-800 ring-amber-600/10'
            }`}>
              {deviation.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <span className="text-slate-400 font-medium block text-xs">Production Line</span>
              <span className="font-bold text-slate-700">{deviation.line}</span>
            </div>
            {deviation.initiatorName && (
              <div>
                <span className="text-slate-400 font-medium block text-xs">Initiator Name</span>
                <span className="font-bold text-slate-700">{deviation.initiatorName}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 font-medium block text-xs">Duration Period</span>
              <span className="font-bold text-slate-700">
                {formatDate(deviation.startDate)} to {formatDate(deviation.endDate)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Total Quantity Produced</span>
              <span className="font-bold text-slate-700">{deviation.totalQuantityProduced} sqm</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Quantity under Deviation</span>
              <span className="font-bold text-slate-700">{deviation.quantityUnderDeviation} sqm</span>
            </div>
            <div className="col-span-1 md:col-span-2">
              <span className="text-slate-400 font-medium block text-xs">Nature of Deviation</span>
              <span className="font-bold text-slate-800">{deviation.natureOfDeviation}</span>
            </div>
            <div className="col-span-1 md:col-span-2">
              <span className="text-slate-400 font-medium block text-xs">Detailed Breakdown</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 font-medium mt-1 leading-relaxed">
                {deviation.detailsOfDeviation}
              </div>
            </div>
            {deviation.attachments && deviation.attachments.length > 0 && (
              <div className="col-span-1 md:col-span-2">
                <span className="text-slate-400 font-medium block text-xs mb-2">Attached Documents</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {deviation.attachments.map((file: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition-all shadow-sm group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-5 h-5 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate max-w-[180px] sm:max-w-[240px]">
                            {file.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">
                            {(file.fileData.length * 0.75 / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadAttachment(file)}
                        className="p-2 hover:bg-white text-slate-500 hover:text-orange-500 border border-transparent hover:border-slate-200/60 rounded-xl transition-all cursor-pointer shadow-sm"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-1 md:col-span-2 flex items-center justify-between text-xs text-slate-400 pt-2 font-medium border-t border-slate-50">
              <span>Created By: {deviation.createdBy?.firstName} {deviation.createdBy?.lastName}</span>
              <span>Created On: {formatDateTime(deviation.createdAt)}</span>
            </div>
          </div>
        </section>

        {/* Assigned Responsible Persons Checklist */}
        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-3">Assigned Responsible Persons</h3>
          <div className="space-y-3">
            {deviation.responsiblePersons?.map((rp: any) => (
              <div key={rp.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle className={`w-5 h-5 shrink-0 ${rp.signedAt ? 'text-green-500' : 'text-slate-300'}`} />
                <div>
                  <div className="text-sm font-bold text-slate-700">{rp.user?.firstName} {rp.user?.lastName}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{rp.user?.email}</div>
                </div>
                {rp.signedAt ? (
                  <span className="text-slate-500 italic text-[11px] ml-auto font-medium">Signed on {formatDateTime(rp.signedAt)}</span>
                ) : (
                  <span className="text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5 text-[10px] font-bold ml-auto uppercase tracking-wide">Pending Sign</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Action Plan Sign-off for Responsible Person */}
        {deviation.status === 'OPEN' && isResponsiblePerson && !hasSignedAsResponsible && (
          <section className="bg-white p-6 rounded-2xl border border-orange-100 shadow-md ring-1 ring-orange-200/50 space-y-4">
            <div className="flex items-center gap-2 text-orange-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-black uppercase tracking-wider">Action Plan (Your Signature Required)</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Root Cause Analysis *</label>
                <textarea 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-slate-55 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700 resize-none" 
                  placeholder="Identify root cause..."
                  value={actionData.rootCauseAnalysis} 
                  onChange={(e) => setActionData({ ...actionData, rootCauseAnalysis: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Containment Action *</label>
                <textarea 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-slate-55 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700 resize-none" 
                  placeholder="Containment measures..."
                  value={actionData.containmentAction} 
                  onChange={(e) => setActionData({ ...actionData, containmentAction: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Corrective Action *</label>
                <textarea 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-slate-55 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700 resize-none" 
                  placeholder="Corrective actions..."
                  value={actionData.correctiveAction} 
                  onChange={(e) => setActionData({ ...actionData, correctiveAction: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Disposal Action *</label>
                <textarea 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-slate-55 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700 resize-none" 
                  placeholder="Disposal actions..."
                  value={actionData.disposalAction} 
                  onChange={(e) => setActionData({ ...actionData, disposalAction: e.target.value })} 
                />
              </div>
              
              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleActionSign} 
                  disabled={actionLoading} 
                  className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-orange-100 hover:shadow-orange-200 flex items-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save & Sign Action Plan
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Display Submitted Action Plans */}
        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-slate-700">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-3">Action Plans Details</h3>
          {deviation.status !== 'OPEN' ? (
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <span className="text-slate-400 font-medium block text-xs">Root Cause Analysis</span>
                <span className="font-bold text-slate-700">{deviation.rootCauseAnalysis || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Containment Action</span>
                <span className="font-bold text-slate-700">{deviation.containmentAction || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Corrective Action</span>
                <span className="font-bold text-slate-700">{deviation.correctiveAction || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Disposal Action</span>
                <span className="font-bold text-slate-700">{deviation.disposalAction || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="italic text-slate-400 text-xs font-semibold py-4 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Awaiting action plan submissions from assigned responsible person(s).
            </div>
          )}
        </section>

        {/* Marketing Review and Sign-off */}
        {deviation.status === 'PENDING_MARKETING' && isMarketingPerson && (
          <section className="bg-white p-6 rounded-2xl border border-orange-100 shadow-md ring-1 ring-orange-200/50 space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-3">Marketing Remarks</h3>
            <textarea 
              rows={3} 
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700 resize-none" 
              placeholder="Provide marketing feedback..." 
              value={marketingRemark} 
              onChange={(e) => setMarketingRemark(e.target.value)} 
            />
            <div className="flex justify-end">
              <button 
                onClick={handleMarketingSign} 
                disabled={actionLoading} 
                className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-orange-100 flex items-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Sign Remarks
              </button>
            </div>
          </section>
        )}

        {/* Display Marketing remarks if signed */}
        {deviation.status !== 'OPEN' && deviation.status !== 'PENDING_MARKETING' && deviation.marketingPersonId && (
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-3">Marketing Remarks</h3>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-600 font-medium text-sm leading-relaxed">
              {deviation.marketingRemarks || 'No remarks provided.'}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-50">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Signed by: {deviation.marketingPerson?.firstName} {deviation.marketingPerson?.lastName}</span>
              <span className="ml-auto">Signed On: {deviation.marketingSignedAt && formatDateTime(deviation.marketingSignedAt)}</span>
            </div>
          </section>
        )}

        {/* Plant Head Approval Screen */}
        {deviation.status === 'PENDING_PLANT_HEAD' && isPlantHead && (
          <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider border-b border-amber-100 pb-3">Plant Head Approval Required</h3>
            <p className="text-xs text-amber-700 leading-relaxed font-semibold">Please audit root cause analysis, action items, and marketing remarks. Add optional remarks and approve to route this deviation to the Quality Head.</p>
            <textarea 
              rows={3} 
              className="w-full px-4 py-3 text-sm bg-white border border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 resize-none" 
              placeholder="Plant Head Remarks (optional)..." 
              value={plantHeadRemark} 
              onChange={(e) => setPlantHeadRemark(e.target.value)} 
            />
            <div className="flex justify-end">
              <button 
                onClick={handlePlantHeadApprove} 
                disabled={actionLoading} 
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-amber-200 flex items-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve & Escalate to Quality Head
              </button>
            </div>
          </section>
        )}

        {/* CEO Approval Screen */}
        {deviation.status === 'PENDING_PLANT_HEAD' && isCeo && (
          <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider border-b border-amber-100 pb-3">CEO Approval Required</h3>
            <p className="text-xs text-amber-700 leading-relaxed font-semibold">Please audit root cause analysis, action items, and marketing remarks. Add optional remarks and approve to route this deviation to the Quality Head.</p>
            <textarea 
              rows={3} 
              className="w-full px-4 py-3 text-sm bg-white border border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 resize-none" 
              placeholder="CEO Remarks (optional)..." 
              value={ceoRemark} 
              onChange={(e) => setCeoRemark(e.target.value)} 
            />
            <div className="flex justify-end">
              <button 
                onClick={handleCeoApprove} 
                disabled={actionLoading} 
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-amber-200 flex items-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve & Escalate to Quality Head
              </button>
            </div>
          </section>
        )}

        {/* Display Plant Head remarks if signed */}
        {deviation.plantHeadId && (
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-3">Plant Head Remarks</h3>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-600 font-medium text-sm leading-relaxed">
              {deviation.plantHeadRemarks || 'No remarks provided.'}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-50">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Approved by: {deviation.plantHead?.firstName} {deviation.plantHead?.lastName}</span>
              <span className="ml-auto">Approved On: {deviation.plantHeadSignedAt && formatDateTime(deviation.plantHeadSignedAt)}</span>
            </div>
          </section>
        )}

        {/* Display CEO remarks if signed */}
        {deviation.ceoId && (
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-3">CEO Remarks</h3>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-600 font-medium text-sm leading-relaxed">
              {deviation.ceoRemarks || 'No remarks provided.'}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-50">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Approved by: {deviation.ceo?.firstName} {deviation.ceo?.lastName}</span>
              <span className="ml-auto">Approved On: {deviation.ceoSignedAt && formatDateTime(deviation.ceoSignedAt)}</span>
            </div>
          </section>
        )}

        {/* Quality Head Final Approval Screen */}
        {deviation.status === 'PENDING_QUALITY_HEAD' && isQualityHead && (
          <section className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider border-b border-emerald-100 pb-3">Quality Head Final Closeout</h3>
            <p className="text-xs text-emerald-700 leading-relaxed font-semibold">You are the final authority in this deviation workflow. Please write final quality assessment comments below and finalize this request to mark it as CLOSED.</p>
            <textarea 
              rows={3} 
              className="w-full px-4 py-3 text-sm bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-slate-700 resize-none" 
              placeholder="Quality Head remarks (optional)..." 
              value={qualityHeadRemark} 
              onChange={(e) => setQualityHeadRemark(e.target.value)} 
            />
            <div className="flex justify-end">
              <button 
                onClick={handleQualityHeadApprove} 
                disabled={actionLoading} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-emerald-200 flex items-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Finalize & Close Deviation
              </button>
            </div>
          </section>
        )}

        {/* Closed / Quality Head Approval display */}
        {deviation.status === 'CLOSED' && (
          <section className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Final Closeout Details (Quality Head)
            </h3>
            {deviation.qualityHeadRemarks && (
              <div className="p-3 bg-white rounded-xl border border-emerald-100 italic text-emerald-800 font-medium text-sm leading-relaxed">
                {deviation.qualityHeadRemarks}
              </div>
            )}
            <p className="text-[11px] text-emerald-700 font-semibold mt-2">
              Approved by: {deviation.qualityHead?.firstName} {deviation.qualityHead?.lastName} on {deviation.qualityHeadSignedAt && formatDateTime(deviation.qualityHeadSignedAt)}
            </p>
          </section>
        )}

        {/* Audit Trail Section */}
        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Audit Trail History
          </h3>
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              {deviation.auditLogs?.map((log: any, logIdx: number) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {logIdx !== deviation.auditLogs.length - 1 ? (
                      <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex items-start space-x-3">
                      <div>
                        <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white shadow-sm ${
                          log.action.includes('CREATE') ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          log.action.includes('SIGN') || log.action.includes('APPROVE') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-slate-50 text-slate-600 border border-slate-100'
                        }`}>
                          {log.action.includes('SIGN') || log.action.includes('APPROVE') ? <CheckCircle className="h-4 h-4" /> : <Clock className="h-4 h-4" />}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-2 text-xs">
                        <div>
                          <p className="text-slate-600 font-medium">
                            {log.details || log.action.replace(/_/g, ' ')}{' '}
                            <span className="font-bold text-slate-800">
                              {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                            </span>
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-slate-400 font-semibold">
                          {formatDateTime(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {(!deviation.auditLogs || deviation.auditLogs.length === 0) && (
                <li className="text-xs text-slate-400 font-semibold italic pl-4 pb-4">No audit trails recorded for this deviation.</li>
              )}
            </ul>
          </div>
        </section>

      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-8 text-center text-slate-400 text-[10px] tracking-widest uppercase">
        &copy; 2026 Borosil Renewables Ltd. All Rights Reserved.
      </footer>
    </div>
  );
}
