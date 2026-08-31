import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Save, FileText, Loader2, AlertCircle, ShieldAlert, Download, Trash2, LogOut, HelpCircle, Edit3 } from 'lucide-react';
import api from '../api';
import { generateDeviationPdf } from '../utils/generateDeviationPdf';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import UserGuideModal from '../components/UserGuideModal';

export default function DeviationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deviation, setDeviation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Current logged in user context
  const userString = localStorage.getItem('pd_user');
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    localStorage.removeItem('pd_token');
    localStorage.removeItem('pd_user');
    navigate('/login');
  };

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

  // Attachment states for each approval step
  const [marketingAttachments, setMarketingAttachments] = useState<any[]>([]);
  const [plantHeadAttachments, setPlantHeadAttachments] = useState<any[]>([]);
  const [ceoAttachments, setCeoAttachments] = useState<any[]>([]);
  const [qualityHeadAttachments, setQualityHeadAttachments] = useState<any[]>([]);
  const [actionPlanAttachments, setActionPlanAttachments] = useState<any[]>([]);

  // Update Quantity Modal states
  const [isUpdateQtyModalOpen, setIsUpdateQtyModalOpen] = useState(false);
  const [qtyData, setQtyData] = useState({
    totalQuantityProduced: '',
    quantityUnderDeviation: '',
    quantityUnderDeviationPcs: ''
  });
  const [qtySubmitting, setQtySubmitting] = useState(false);


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

      setQtyData({
        totalQuantityProduced: data.updatedTotalQuantityProduced ?? data.totalQuantityProduced ?? '',
        quantityUnderDeviation: data.updatedQuantityUnderDeviation ?? data.quantityUnderDeviation ?? '',
        quantityUnderDeviationPcs: data.updatedQuantityUnderDeviationPcs ?? data.quantityUnderDeviationPcs ?? ''
      });
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch details for this deviation record.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyData.totalQuantityProduced === '' || qtyData.quantityUnderDeviation === '') {
      alert('Please enter Total Quantity Produced and Quantity Under Deviation.');
      return;
    }
    setQtySubmitting(true);
    try {
      await api.put(`/product-deviation/${id}/update-quantity`, {
        totalQuantityProduced: Number(qtyData.totalQuantityProduced),
        quantityUnderDeviation: Number(qtyData.quantityUnderDeviation),
        quantityUnderDeviationPcs: qtyData.quantityUnderDeviationPcs !== '' ? Number(qtyData.quantityUnderDeviationPcs) : undefined
      });
      alert('Quantities updated successfully. Record sent for re-approval.');
      setIsUpdateQtyModalOpen(false);
      await fetchDeviationDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error updating deviation quantity.');
    } finally {
      setQtySubmitting(false);
    }
  };


  const handleActionSign = async () => {
    if (!actionData.rootCauseAnalysis.trim() || !actionData.containmentAction.trim() || !actionData.correctiveAction.trim() || !actionData.disposalAction.trim()) {
      alert('Please fill out all action fields before signing.');
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/product-deviation/${id}/action`, { 
        ...actionData, 
        attachments: actionPlanAttachments 
      });
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
      await api.put(`/product-deviation/${id}/marketing`, { 
        marketingRemarks: marketingRemark,
        attachments: marketingAttachments 
      });
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
      await api.put(`/product-deviation/${id}/plant-head`, { 
        plantHeadRemarks: plantHeadRemark,
        attachments: plantHeadAttachments 
      });
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
      await api.put(`/product-deviation/${id}/ceo`, { 
        ceoRemarks: ceoRemark,
        attachments: ceoAttachments 
      });
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
      await api.put(`/product-deviation/${id}/quality-head`, { 
        qualityHeadRemarks: qualityHeadRemark,
        attachments: qualityHeadAttachments 
      });
      await fetchDeviationDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error finalizing deviation record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this entire product deviation entry? This action cannot be undone.')) {
      return;
    }
    setActionLoading(true);
    try {
      await api.delete(`/product-deviation/${id}`);
      alert('Product deviation deleted successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete product deviation.');
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
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/85 sticky top-0 z-40 shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 hover:bg-slate-150 text-slate-605 rounded-xl transition-all border border-slate-250 cursor-pointer mr-1 bg-white hover:scale-105 active:scale-95 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img src="/logo.png" alt="Borosil Logo" className="h-10 w-auto object-contain" />
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight">Deviation: {deviation.serialNumber}</h1>
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Line: {deviation.line}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="h-11 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-2 transition-all shadow-md shadow-rose-100 font-bold text-sm cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            {deviation.status === 'CLOSED' && (
              <button
                onClick={() => generateDeviationPdf(deviation)}
                className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-100 font-bold text-sm cursor-pointer shrink-0"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            )}

            <button 
              onClick={() => setIsGuideOpen(true)}
              className="h-11 px-4 bg-slate-100/50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 rounded-xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shrink-0 hover:scale-102 active:scale-98"
              title="User Guide"
            >
              <HelpCircle className="w-4 h-4 text-orange-500" />
              <span>User Guide</span>
            </button>
            
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3.5 h-11 bg-slate-100/50 rounded-xl border border-slate-200/80 shrink-0 shadow-sm">
                <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-605 font-bold text-xs">
                  {user.firstName[0]}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {user.role} {user.department ? `| ${user.department}` : ''}
                  </div>
                </div>
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className="h-11 px-4 bg-slate-100/50 hover:bg-red-50 text-slate-655 hover:text-red-655 rounded-xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shrink-0 hover:scale-102 active:scale-98"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Workflow Sequence Stepper Card */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
            Workflow Stage Sequence
          </div>
          
          {(() => {
            const hasMarketingStage = Boolean(deviation.marketingPersonId || deviation.marketingPerson || deviation.status === 'PENDING_MARKETING' || deviation.marketingRemarks);
            return (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {/* Step 1: Creation */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    1. Created
                  </span>
                  <span className="text-slate-300 font-bold">→</span>
                </div>

                {/* Step 2: Analysis */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                    deviation.status !== 'OPEN'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                  }`}>
                    {deviation.status !== 'OPEN' ? <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                    2. Analysis & Action Plan
                  </span>
                  <span className="text-slate-300 font-bold">→</span>
                </div>

                {/* Step 3 (Dynamic): Marketing Review */}
                {hasMarketingStage && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                      deviation.marketingSignedAt || deviation.status === 'PENDING_PLANT_HEAD' || deviation.status === 'PENDING_QUALITY_HEAD' || deviation.status === 'CLOSED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : deviation.status === 'PENDING_MARKETING'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      {deviation.marketingSignedAt || deviation.status === 'PENDING_PLANT_HEAD' || deviation.status === 'PENDING_QUALITY_HEAD' || deviation.status === 'CLOSED' ? <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> : <Clock className="w-3.5 h-3.5" />}
                      3. Marketing Review
                    </span>
                    <span className="text-slate-300 font-bold">→</span>
                  </div>
                )}

                {/* Step 4 (or 3): Plant Head / CEO Approval */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                    deviation.status === 'PENDING_QUALITY_HEAD' || deviation.status === 'CLOSED'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : deviation.status === 'PENDING_PLANT_HEAD'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {deviation.status === 'PENDING_QUALITY_HEAD' || deviation.status === 'CLOSED' ? <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> : <Clock className="w-3.5 h-3.5" />}
                    {hasMarketingStage ? '4. Plant Head / CEO Approval' : '3. Plant Head / CEO Approval'}
                  </span>
                  <span className="text-slate-300 font-bold">→</span>
                </div>

                {/* Step 5 (or 4): QC Head Closure */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                    deviation.status === 'CLOSED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : deviation.status === 'PENDING_QUALITY_HEAD'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {deviation.status === 'CLOSED' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5" />}
                    {hasMarketingStage ? '5. QC Head Closure' : '4. QC Head Closure'}
                  </span>
                </div>

                {/* Post-Update Re-Approval Sequence (if quantities were updated) */}
                {deviation.quantityUpdatedAt && (
                  <>
                    <span className="text-amber-500 font-black px-1">⟹</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        {hasMarketingStage ? '6. Update Qty' : '5. Update Qty'}
                      </span>
                      <span className="text-slate-300 font-bold">→</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                        (deviation.plantHeadSignedAt && new Date(deviation.plantHeadSignedAt) >= new Date(deviation.quantityUpdatedAt)) || (deviation.ceoSignedAt && new Date(deviation.ceoSignedAt) >= new Date(deviation.quantityUpdatedAt))
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : deviation.status === 'PENDING_PLANT_HEAD'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {(deviation.plantHeadSignedAt && new Date(deviation.plantHeadSignedAt) >= new Date(deviation.quantityUpdatedAt)) || (deviation.ceoSignedAt && new Date(deviation.ceoSignedAt) >= new Date(deviation.quantityUpdatedAt)) ? <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> : <Clock className="w-3.5 h-3.5" />}
                        {hasMarketingStage ? '7. Plant Head/CEO Re-Approval' : '6. Plant Head/CEO Re-Approval'}
                      </span>
                      <span className="text-slate-300 font-bold">→</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                        deviation.status === 'CLOSED' && deviation.qualityHeadSignedAt && new Date(deviation.qualityHeadSignedAt) >= new Date(deviation.quantityUpdatedAt)
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {deviation.status === 'CLOSED' && deviation.qualityHeadSignedAt && new Date(deviation.qualityHeadSignedAt) >= new Date(deviation.quantityUpdatedAt) ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5" />}
                        {hasMarketingStage ? '8. QC Head Final Closure' : '7. QC Head Final Closure'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </section>

        {/* Basic Information card */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100/60 pb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Basic Specification</h3>
              {isResponsiblePerson && (
                <button
                  type="button"
                  onClick={() => setIsUpdateQtyModalOpen(true)}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Modify quantity after running/completion"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modify Quantity</span>
                </button>
              )}
            </div>
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
              <span className="text-slate-400 font-medium block text-xs">Total Quantity Produced (pcs)</span>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="font-bold text-slate-700">{deviation.totalQuantityProduced} pcs</span>
                {deviation.updatedTotalQuantityProduced !== null && deviation.updatedTotalQuantityProduced !== undefined && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                    Updated: {deviation.updatedTotalQuantityProduced} pcs
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Quantity under Deviation (pcs)</span>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="font-bold text-slate-700">{deviation.quantityUnderDeviation} pcs</span>
                {deviation.updatedQuantityUnderDeviation !== null && deviation.updatedQuantityUnderDeviation !== undefined && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                    Updated: {deviation.updatedQuantityUnderDeviation} pcs
                  </span>
                )}
              </div>
            </div>
            {(deviation.quantityUnderDeviationPcs !== null && deviation.quantityUnderDeviationPcs !== undefined || deviation.updatedQuantityUnderDeviationPcs !== null && deviation.updatedQuantityUnderDeviationPcs !== undefined) && (
              <div>
                <span className="text-slate-400 font-medium block text-xs">Quantity under Deviation (sqm)</span>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="font-bold text-slate-700">{deviation.quantityUnderDeviationPcs ?? 'N/A'} sqm</span>
                  {deviation.updatedQuantityUnderDeviationPcs !== null && deviation.updatedQuantityUnderDeviationPcs !== undefined && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                      Updated: {deviation.updatedQuantityUnderDeviationPcs} sqm
                    </span>
                  )}
                </div>
              </div>
            )}
            {deviation.quantityUpdatedAt && (
              <div className="col-span-1 md:col-span-2 bg-blue-50/70 border border-blue-200/80 p-3 rounded-xl flex items-center justify-between text-xs text-blue-800 font-semibold">
                <span>Quantity updated by: <strong>{deviation.quantityUpdatedBy?.firstName} {deviation.quantityUpdatedBy?.lastName}</strong></span>
                <span>Updated on: <strong>{formatDateTime(deviation.quantityUpdatedAt)}</strong></span>
              </div>
            )}
            <div className="col-span-1 md:col-span-2">
              <span className="text-slate-400 font-medium block text-xs">Nature of Deviation</span>
              <span className="font-bold text-slate-800">{deviation.natureOfDeviation}</span>
            </div>
            <div className="col-span-1 md:col-span-2">
              <span className="text-slate-400 font-medium block text-xs">Detailed Breakdown</span>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-650 font-medium mt-1 leading-relaxed">
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
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl transition-all shadow-soft group"
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
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100/60 pb-3">Assigned Responsible Persons</h3>
          <div className="space-y-3">
            {deviation.responsiblePersons?.map((rp: any) => (
              <div key={rp.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <CheckCircle className={`w-5 h-5 shrink-0 ${rp.signedAt ? 'text-green-500 animate-pulse' : 'text-slate-300'}`} />
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
          <section className="bg-white p-6 rounded-2xl border border-orange-200 shadow-soft space-y-4 ring-1 ring-orange-200/40">
            <div className="flex items-center gap-2 text-orange-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-black uppercase tracking-wider">Action Plan (Your Signature Required)</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Root Cause Analysis *</label>
                <textarea 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-medium text-slate-750 resize-none" 
                  placeholder="Identify root cause..."
                  value={actionData.rootCauseAnalysis} 
                  onChange={(e) => setActionData({ ...actionData, rootCauseAnalysis: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Containment Action *</label>
                <textarea 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-medium text-slate-750 resize-none" 
                  placeholder="Containment measures..."
                  value={actionData.containmentAction} 
                  onChange={(e) => setActionData({ ...actionData, containmentAction: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Corrective Action *</label>
                <textarea 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-medium text-slate-750 resize-none" 
                  placeholder="Corrective actions..."
                  value={actionData.correctiveAction} 
                  onChange={(e) => setActionData({ ...actionData, correctiveAction: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Disposal Action *</label>
                <textarea 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-medium text-slate-750 resize-none" 
                  placeholder="Disposal actions..."
                  value={actionData.disposalAction} 
                  onChange={(e) => setActionData({ ...actionData, disposalAction: e.target.value })} 
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Optional Attachments</label>
                <input type="file" multiple onChange={handleActionPlanAttachmentUpload} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer" />
                {actionPlanAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {actionPlanAttachments.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-600">
                        {f.name}
                        <button type="button" onClick={() => setActionPlanAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
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
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft space-y-4 text-slate-700">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100/60 pb-3">Action Plans Details</h3>
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
              {deviation.actionPlanAttachments && deviation.actionPlanAttachments.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <span className="text-slate-400 font-bold text-[10px] uppercase block tracking-wider">Action Plan Attachments</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {deviation.actionPlanAttachments.map((file: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs shadow-soft">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                          <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-white text-slate-500 hover:text-orange-500 rounded-lg border border-transparent hover:border-slate-200 cursor-pointer">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          <section className="bg-white p-6 rounded-2xl border border-orange-255 shadow-soft space-y-4 ring-1 ring-orange-200/30">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100/60 pb-3">Marketing Remarks</h3>
            <textarea 
              rows={3} 
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-medium text-slate-750 resize-none" 
              placeholder="Provide marketing feedback..." 
              value={marketingRemark} 
              onChange={(e) => setMarketingRemark(e.target.value)} 
            />
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Optional Attachments</label>
              <input type="file" multiple onChange={handleMarketingAttachmentUpload} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer" />
              {marketingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {marketingAttachments.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-600">
                      {f.name}
                      <button type="button" onClick={() => setMarketingAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100/60 pb-3">Marketing Remarks</h3>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 italic text-slate-650 font-medium text-sm leading-relaxed">
              {deviation.marketingRemarks || 'No remarks provided.'}
            </div>
            {deviation.marketingAttachments && deviation.marketingAttachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <span className="text-slate-400 font-bold text-[10px] uppercase block tracking-wider">Marketing Attachments</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deviation.marketingAttachments.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs shadow-soft">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-white text-slate-500 hover:text-orange-500 rounded-lg border border-transparent hover:border-slate-200 cursor-pointer">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100/60">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Signed by: {deviation.marketingPerson?.firstName} {deviation.marketingPerson?.lastName}</span>
              <span className="ml-auto">Signed On: {deviation.marketingSignedAt && formatDateTime(deviation.marketingSignedAt)}</span>
            </div>
          </section>
        )}

        {/* Plant Head Approval Screen */}
        {deviation.status === 'PENDING_PLANT_HEAD' && isPlantHead && (
          <section className="bg-amber-50/40 p-6 rounded-2xl border border-amber-200/80 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider border-b border-amber-200/60 pb-3">Plant Head Approval Required</h3>
            <p className="text-xs text-amber-750 leading-relaxed font-semibold">Please audit root cause analysis, action items, and marketing remarks. Add optional remarks and approve to route this deviation to the Quality Head.</p>
            <textarea 
              rows={3} 
              className="w-full px-4 py-3 text-sm bg-white border border-amber-200/80 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-750 resize-none shadow-sm" 
              placeholder="Plant Head Remarks (optional)..." 
              value={plantHeadRemark} 
              onChange={(e) => setPlantHeadRemark(e.target.value)} 
            />
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-widest ml-1">Optional Attachments</label>
              <input type="file" multiple onChange={handlePlantHeadAttachmentUpload} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer" />
              {plantHeadAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {plantHeadAttachments.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-800">
                      {f.name}
                      <button type="button" onClick={() => setPlantHeadAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-amber-400 hover:text-amber-600 font-bold">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
          <section className="bg-amber-50/40 p-6 rounded-2xl border border-amber-200/80 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider border-b border-amber-200/60 pb-3">CEO Approval Required</h3>
            <p className="text-xs text-amber-750 leading-relaxed font-semibold">Please audit root cause analysis, action items, and marketing remarks. Add optional remarks and approve to route this deviation to the Quality Head.</p>
            <textarea 
              rows={3} 
              className="w-full px-4 py-3 text-sm bg-white border border-amber-200/80 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-750 resize-none shadow-sm" 
              placeholder="CEO Remarks (optional)..." 
              value={ceoRemark} 
              onChange={(e) => setCeoRemark(e.target.value)} 
            />
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-widest ml-1">Optional Attachments</label>
              <input type="file" multiple onChange={handleCeoAttachmentUpload} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer" />
              {ceoAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {ceoAttachments.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-800">
                      {f.name}
                      <button type="button" onClick={() => setCeoAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-amber-400 hover:text-amber-600 font-bold">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100/60 pb-3">Plant Head Remarks</h3>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 italic text-slate-650 font-medium text-sm leading-relaxed">
              {deviation.plantHeadRemarks || 'No remarks provided.'}
            </div>
            {deviation.plantHeadAttachments && deviation.plantHeadAttachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <span className="text-slate-400 font-bold text-[10px] uppercase block tracking-wider">Plant Head Attachments</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deviation.plantHeadAttachments.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-white text-slate-500 hover:text-orange-500 rounded-lg border border-transparent hover:border-slate-200 cursor-pointer">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-50">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Approved by: {deviation.plantHead?.firstName} {deviation.plantHead?.lastName}</span>
              <span className="ml-auto">Approved On: {deviation.plantHeadSignedAt && formatDateTime(deviation.plantHeadSignedAt)}</span>
            </div>
          </section>
        )}

        {/* Display CEO remarks if signed */}
        {deviation.ceoId && (
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100/60 pb-3">CEO Remarks</h3>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 italic text-slate-650 font-medium text-sm leading-relaxed">
              {deviation.ceoRemarks || 'No remarks provided.'}
            </div>
            {deviation.ceoAttachments && deviation.ceoAttachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <span className="text-slate-400 font-bold text-[10px] uppercase block tracking-wider">CEO Attachments</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deviation.ceoAttachments.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-white text-slate-500 hover:text-orange-500 rounded-lg border border-transparent hover:border-slate-200 cursor-pointer">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-50">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Approved by: {deviation.ceo?.firstName} {deviation.ceo?.lastName}</span>
              <span className="ml-auto">Approved On: {deviation.ceoSignedAt && formatDateTime(deviation.ceoSignedAt)}</span>
            </div>
          </section>
        )}

        {/* Quality Head Final Approval Screen */}
        {deviation.status === 'PENDING_QUALITY_HEAD' && isQualityHead && (
          <section className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-200/80 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider border-b border-emerald-200/60 pb-3">Quality Head Final Closeout</h3>
            <p className="text-xs text-emerald-755 leading-relaxed font-semibold">You are the final authority in this deviation workflow. Please write final quality assessment comments below and finalize this request to mark it as CLOSED.</p>
            <textarea 
              rows={3} 
              className="w-full px-4 py-3 text-sm bg-white border border-emerald-200/80 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium text-slate-750 resize-none shadow-sm" 
              placeholder="Quality Head remarks (optional)..." 
              value={qualityHeadRemark} 
              onChange={(e) => setQualityHeadRemark(e.target.value)} 
            />
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest ml-1">Optional Attachments</label>
              <input type="file" multiple onChange={handleQualityHeadAttachmentUpload} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer" />
              {qualityHeadAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {qualityHeadAttachments.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-emerald-200 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-800">
                      {f.name}
                      <button type="button" onClick={() => setQualityHeadAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-emerald-400 hover:text-emerald-600 font-bold">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
          <section className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-250 shadow-soft space-y-3">
            <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider border-b border-emerald-200/60 pb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-650 animate-pulse" />
              Final Closeout Details (Quality Head)
            </h3>
            {deviation.qualityHeadRemarks && (
              <div className="p-3.5 bg-white rounded-xl border border-emerald-200/80 italic text-emerald-800 font-medium text-sm leading-relaxed">
                {deviation.qualityHeadRemarks}
              </div>
            )}
            {deviation.qualityHeadAttachments && deviation.qualityHeadAttachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <span className="text-emerald-800 font-bold text-[10px] uppercase block tracking-wider">Quality Head Attachments</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deviation.qualityHeadAttachments.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-white border border-emerald-100 rounded-xl text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-emerald-850 truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button onClick={() => downloadAttachment(file)} className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-850 rounded-lg border border-transparent hover:border-emerald-100 cursor-pointer">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-emerald-700 font-semibold mt-2">
              Approved by: {deviation.qualityHead?.firstName} {deviation.qualityHead?.lastName} on {deviation.qualityHeadSignedAt && formatDateTime(deviation.qualityHeadSignedAt)}
            </p>
          </section>
        )}

        {/* Audit Trail Section */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft space-y-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100/60 pb-3 flex items-center gap-2">
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

      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Update Quantity Modal */}
      {isUpdateQtyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800">Modify Deviation Quantity</h3>
              <button
                type="button"
                onClick={() => setIsUpdateQtyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateQuantitySubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Total Quantity Produced (pcs) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-orange-500 focus:bg-white outline-none transition-all"
                  value={qtyData.totalQuantityProduced}
                  onChange={(e) => setQtyData({ ...qtyData, totalQuantityProduced: e.target.value })}
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Quantity Under Deviation (pcs) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-orange-500 focus:bg-white outline-none transition-all"
                  value={qtyData.quantityUnderDeviation}
                  onChange={(e) => setQtyData({ ...qtyData, quantityUnderDeviation: e.target.value })}
                  placeholder="e.g. 250"
                />
              </div>

              <div className="text-xs text-amber-800 bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 leading-relaxed font-medium">
                <strong>Note:</strong> Saving modified quantities will log your update in the audit trail and resubmit the deviation for re-approval (Plant Head/CEO → Quality Head).
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateQtyModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={qtySubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md shadow-orange-100"
                >
                  {qtySubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save & Resubmit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

