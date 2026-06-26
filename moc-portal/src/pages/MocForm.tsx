import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Save, Send, CheckCircle2, LogOut } from 'lucide-react';
import api from '../api';
import Section1BasicInfo from '../components/Section1BasicInfo';
import Section2ActionSheet from '../components/Section2ActionSheet';
import Section3Implementation from '../components/Section3Implementation';

const steps = [
  { id: 1, title: 'Basic Information', description: 'General MOC details' },
  { id: 2, title: 'Action Sheet', description: 'Trial & Action plans' },
  { id: 3, title: 'Implementation', description: 'Photos & Approvals' },
];

const defaultActions = [
  {
    id: 1,
    description: 'Changes required in QYP / specification',
    applicable: false,
    actions: [{ id: '1-1', text: '', targetDate: '', completedDate: '', responsibility: '' }]
  },
  {
    id: 2,
    description: 'New addition / change of raw material or consumables',
    applicable: false,
    actions: [{ id: '2-1', text: '', targetDate: '', completedDate: '', responsibility: '' }]
  },
  {
    id: 3,
    description: 'Requirement of new Resources (equipment/ machinery/instruments) or modification of existing resources',
    applicable: false,
    actions: [{ id: '3-1', text: '', targetDate: '', completedDate: '', responsibility: '' }]
  },
  {
    id: 4,
    description: 'Change in Quality Risk assessments (QRA)',
    applicable: false,
    actions: [{ id: '4-1', text: '', targetDate: '', completedDate: '', responsibility: '' }]
  },
  {
    id: 5,
    description: 'Change in EHS Risk assessments (EHSRA)',
    applicable: false,
    actions: [{ id: '5-1', text: '', targetDate: '', completedDate: '', responsibility: '' }]
  },
  {
    id: 6,
    description: 'New/changed compliance obligations for product /EHS requirements',
    applicable: false,
    actions: [{ id: '6-1', text: '', targetDate: '', completedDate: '', responsibility: '' }]
  },
  {
    id: 7,
    description: 'Changes in Documentation like QYP, SOP, OCP & ERPs etc',
    applicable: false,
    actions: [{ id: '7-1', text: '', targetDate: '', completedDate: '', responsibility: '' }]
  },
  {
    id: 8,
    description: 'Changes in Competency & training requirements',
    applicable: false,
    actions: [{ id: '8-1', text: '', targetDate: '', completedDate: '', responsibility: '' }]
  }
];

const defaultAffectedDocs = [
  { id: 1, description: 'RM, Waste and Activity lists', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 2, description: 'QRA / EHS risk assessment', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 3, description: 'Quality Plan', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 4, description: 'SOP & OCP', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 5, description: 'EHS Legal Register', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 6, description: 'Product specification sheet & MSDS', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 7, description: 'Plant drawings', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 8, description: 'Integrated management system Manual', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 9, description: 'Integrated / Quality System Procedures', applicable: false, targetDate: '', status: '', docReference: '', approval: '' },
  { id: 10, description: 'If Others, Specify', applicable: false, targetDate: '', status: '', docReference: '', approval: '', isCustom: true }
];

const MocForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [displayMocNo, setDisplayMocNo] = useState(`${new Date().getFullYear()}-...`);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [approvalSequence, setApprovalSequence] = useState<string[]>(['hod', 'qc_head', 'plant_head', 'ceo', 'ehs', 'qa']);

  const getStatusStringForRole = (role: string) => {
    switch (role) {
      case 'hod': return 'Pending HOD';
      case 'qc_head': return 'Pending QC Head';
      case 'plant_head': return 'Pending Plant Head';
      case 'ceo': return 'Pending CEO';
      case 'ehs': return 'Pending EHS';
      case 'qa': return 'Pending QA';
      default: return 'Pending HOD';
    }
  };

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('moc_user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.error('Failed to parse user info:', e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('moc_token');
    localStorage.removeItem('moc_user');
    navigate('/login');
  };

  const [formData, setFormData] = useState<any>({
    // Section 1
    status: 'Draft',
    department: '',
    mocMode: '',
    productProcess: '',
    description: '',
    classification: [],
    particular: '',
    currentStatus: '',
    changesRequired: '',
    reasonForChange: '',
    // Section 2
    actionPlan: defaultActions,
    trialDetails: [],
    affectedDocs: defaultAffectedDocs,
    // Section 3
    pictureBefore: null,
    pictureAfter: null,
    teamMembers: [],
    customerApprovalRequired: false,
    qcHeadApproval: null, // New QC Head approval field
  });

  useEffect(() => {
    api.get('/settings/moc_approval_settings')
      .then(res => {
        if (res.data && res.data.sequence) {
          setApprovalSequence(res.data.sequence);
        }
      })
      .catch(err => console.error('Failed to load MOC approval settings:', err));
  }, []);

  useEffect(() => {
    if (id) {
      api.get(`/moc/${id}`)
        .then(res => {
          if (res.data) {
            setFormData({
              ...res.data,
              actionPlan: res.data.actionPlan || defaultActions,
              trialDetails: res.data.trialDetails || [],
              affectedDocs: res.data.affectedDocs || defaultAffectedDocs,
            });
            setDisplayMocNo(res.data.mocNo);
          }
        })
         .catch(err => console.error('Failed to fetch MOC details:', err));
    } else {
      api.get('/moc/next-number')
        .then(res => {
          if (res.data?.nextNumber) {
            setDisplayMocNo(res.data.nextNumber);
          }
        })
        .catch(err => console.error('Failed to fetch next MOC number:', err));
    }
  }, [id]);

  const validateForm = () => {
    const required = [
      { key: 'department', name: 'Department' },
      { key: 'requestDate', name: 'Request Date' },
      { key: 'mocMode', name: 'MOC Mode' },
      { key: 'productProcess', name: 'Product/Process' },
      { key: 'description', name: 'Description of Change' },
      { key: 'currentStatus', name: 'Current Status' },
      { key: 'changesRequired', name: 'Changes Required' },
      { key: 'reasonForChange', name: 'Reason for Change' },
    ];

    const missing = required.filter(field => !formData[field.key as keyof typeof formData]);
    if (missing.length > 0) {
      alert(`Please fill in the following required fields in Step 1 (Basic Information) before submitting:\n\n• ${missing.map(m => m.name).join('\n• ')}`);
      setCurrentStep(1); // redirect to step 1
      return false;
    }
    return true;
  };

  const handleSave = async (isSubmit: boolean) => {
    if (isSubmit && !validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      
      const userStr = localStorage.getItem('moc_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const requisitionById = user?.id || '';

      const firstRole = approvalSequence[0] || 'hod';
      const firstStatus = getStatusStringForRole(firstRole);

      const payload = {
        ...formData,
        requisitionById,
        status: isSubmit ? firstStatus : 'Draft',
      };

      if (id) {
        await api.patch(`/moc/${id}`, payload);
      } else {
        await api.post('/moc', payload);
      }

      alert(isSubmit ? 'MOC submitted successfully!' : 'MOC draft saved successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Failed to save MOC:', error);
      alert(error.response?.data?.message || 'Failed to submit MOC. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproval = async (
    roleType: 'hod' | 'qc_head' | 'plant_head' | 'ceo' | 'ehs' | 'qa',
    decision: 'approved' | 'rejected',
    remarks: string,
    sign: string
  ) => {
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
      const approvalData = {
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || 'Approver',
        designation: currentUser.role || 'Authority',
        sign,
        remarks,
        status: decision,
        date: new Date(),
      };

      const updatedFormData: any = { ...formData };
      
      if (decision === 'rejected') {
        updatedFormData.status = 'Draft';
      }
      
      const fieldMap: Record<string, string> = {
        hod: 'hodApproval',
        qc_head: 'qcHeadApproval',
        plant_head: 'plantHeadApproval',
        ceo: 'ceoApproval',
        ehs: 'ehsApproval',
        qa: 'qaApproval'
      };

      const dbField = fieldMap[roleType];
      if (dbField) {
        updatedFormData[dbField] = approvalData;
      }

      if (decision === 'approved') {
        const currIdx = approvalSequence.indexOf(roleType);
        if (currIdx !== -1 && currIdx < approvalSequence.length - 1) {
          const nextRole = approvalSequence[currIdx + 1];
          updatedFormData.status = getStatusStringForRole(nextRole);
        } else {
          updatedFormData.status = 'Finalized';
        }
      }

      await api.patch(`/moc/${id}`, updatedFormData);
      setFormData(updatedFormData);
      alert(`MOC successfully ${decision === 'approved' ? 'approved' : 'rejected'}!`);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Failed to submit approval:', err);
      alert(err.response?.data?.message || 'Failed to submit approval. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = formData.status ? formData.status !== 'Draft' : false;

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="max-w-4xl mx-auto py-4 px-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Management of Change</h1>
          <p className="text-xs text-slate-500">Record and manage process or product changes</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded border border-brand-100">
            MOC No: {displayMocNo}
          </span>

          {currentUser && (
            <div className="relative group">
              <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-100 uppercase">
                  {currentUser.firstName?.[0] || currentUser.name?.[0] || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-none">
                    {`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || 'User'}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                    {currentUser.role || 'Operator'}
                  </div>
                </div>
              </button>
              
              {/* Profile Hover Popover */}
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-3 space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <p className="text-xs font-bold text-slate-800 text-left">
                    {`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate text-left">
                    {currentUser.email}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg font-bold transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out / Switch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-6 relative">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-200 -translate-y-1/2 z-0" />
        <div className="flex justify-between relative z-10">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center bg-slate-50 px-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm ${
                  currentStep >= step.id 
                    ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-200' 
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {currentStep > step.id ? <CheckCircle2 className="w-4 h-4" /> : step.id}
              </div>
              <div className="mt-1 text-center">
                <span className={`text-[11px] font-semibold block ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-400'}`}>
                  {step.title}
                </span>
                <span className="text-[9px] text-slate-400 hidden sm:block">{step.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="glass rounded-xl shadow-lg shadow-slate-200/50 p-5 min-h-[350px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 1 && <Section1BasicInfo data={formData} update={setFormData} readOnly={isReadOnly} />}
            {currentStep === 2 && <Section2ActionSheet data={formData} update={setFormData} readOnly={isReadOnly} />}
            {currentStep === 3 && (
              <Section3Implementation 
                data={formData} 
                update={setFormData} 
                currentUser={currentUser}
                handleApproval={handleApproval}
                isSaving={isSaving}
                readOnly={isReadOnly}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center px-4 py-1.5 text-xs rounded-lg font-medium transition-all ${
              currentStep === 1 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </button>

          <div className="flex gap-3">
            {!isReadOnly && (
              <button 
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex items-center px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-all border border-slate-200 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            
            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                className="flex items-center px-5 py-1.5 text-xs bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-all shadow-md shadow-brand-200"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : !isReadOnly ? (
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex items-center px-5 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
              >
                {isSaving ? 'Submitting...' : 'Submit for Approval'}
                <Send className="w-4 h-4 ml-1.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center px-5 py-1.5 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-all shadow-md"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MocForm;
