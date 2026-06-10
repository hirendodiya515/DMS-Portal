import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  PenTool,
  Building2,
  Briefcase,
  Activity
} from 'lucide-react';
import api from '../api';

const Section3Implementation = ({ data, update, currentUser, handleApproval, isSaving, readOnly }: any) => {
  const [remarks, setRemarks] = useState<any>({ hod: '', plant_head: '', ceo: '', ehs: '', qa: '' });
  const [signature, setSignature] = useState<any>({ hod: '', plant_head: '', ceo: '', ehs: '', qa: '' });
  const [authSettings, setAuthSettings] = useState<any>(null);

  // Fetch custom authorized persons configured in main DMS settings
  useEffect(() => {
    api.get('/settings/moc_approval_settings')
      .then(res => {
        if (res.data) {
          setAuthSettings(res.data);
        }
      })
      .catch(err => {
        console.error('Failed to load MOC authorized settings:', err);
      });
  }, []);

  const handleAddMember = () => {
    update((prev: any) => ({ ...prev, teamMembers: [...(prev.teamMembers || []), { name: '', designation: '', remarks: '' }] }));
  };

  const handleRemoveMember = (idx: number) => {
    update((prev: any) => ({ ...prev, teamMembers: prev.teamMembers.filter((_: any, i: number) => i !== idx) }));
  };

  const handleUpdateMember = (idx: number, field: string, val: string) => {
    update((prev: any) => {
      const newList = [...prev.teamMembers];
      newList[idx] = { ...newList[idx], [field]: val };
      return { ...prev, teamMembers: newList };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      update((prev: any) => ({
        ...prev,
        [field]: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  // Logged-in user information
  const fullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.name || '';
  const userEmail = currentUser?.email || '';

  // Can Approve Checks (Checks custom DMS settings, falls back to standard user roles if not set)
  
  // 1. HOD Approval Check (HOD is assigned per MOC)
  const isHodMatched = fullName.toLowerCase() === (data.hodName || '').toLowerCase();
  const isHodRole = currentUser?.role === 'dept_head' || currentUser?.role === 'admin';
  const canApproveHod = data.status === 'Pending HOD' && (isHodMatched || isHodRole);

  // 2. Plant Head Approval Check
  const hasCustomPlantHead = authSettings?.plantHead && authSettings.plantHead.length > 0;
  const isPlantHeadAuthorized = hasCustomPlantHead 
    ? authSettings.plantHead.map((e: string) => e.toLowerCase()).includes(userEmail.toLowerCase()) 
    : false;
  const canApprovePlantHead = data.status === 'Pending Plant Head' && 
    (isPlantHeadAuthorized || (!hasCustomPlantHead && (currentUser?.role === 'admin' || currentUser?.role === 'dept_head' || currentUser?.role === 'reviewer')));

  // 3. CEO Approval Check
  const hasCustomCeo = authSettings?.ceo && authSettings.ceo.length > 0;
  const isCeoAuthorized = hasCustomCeo 
    ? authSettings.ceo.map((e: string) => e.toLowerCase()).includes(userEmail.toLowerCase()) 
    : false;
  const canApproveCeo = data.status === 'Pending CEO' && 
    (isCeoAuthorized || (!hasCustomCeo && (currentUser?.role === 'admin' || currentUser?.role === 'reviewer')));

  // 4. EHS Approval Check
  const hasCustomEhs = authSettings?.ehs && authSettings.ehs.length > 0;
  const isEhsAuthorized = hasCustomEhs 
    ? authSettings.ehs.map((e: string) => e.toLowerCase()).includes(userEmail.toLowerCase()) 
    : false;
  const canApproveEhs = data.status === 'Pending EHS' && 
    (isEhsAuthorized || (!hasCustomEhs && (currentUser?.role === 'compliance_manager' || currentUser?.role === 'admin' || currentUser?.role === 'reviewer')));

  // 5. QA Approval Check
  const hasCustomQa = authSettings?.qa && authSettings.qa.length > 0;
  const isQaAuthorized = hasCustomQa 
    ? authSettings.qa.map((e: string) => e.toLowerCase()).includes(userEmail.toLowerCase()) 
    : false;
  const canApproveQa = data.status === 'Pending QA' && 
    (isQaAuthorized || (!hasCustomQa && (currentUser?.role === 'compliance_manager' || currentUser?.role === 'admin' || currentUser?.role === 'reviewer')));

  const renderApprovalCard = (
    type: 'hod' | 'plant_head' | 'ceo' | 'ehs' | 'qa',
    title: string,
    Icon: any,
    approval: any,
    canApprove: boolean,
    pendingMsg: string
  ) => {
    const isCompleted = approval && approval.status;
    const isApproved = approval?.status === 'approved';

    return (
      <div 
        className={`p-3.5 rounded-xl border transition-all duration-300 bg-white shadow-sm flex flex-col justify-between min-h-[220px] ${
          isCompleted
            ? isApproved
              ? 'border-emerald-200 bg-emerald-50/10'
              : 'border-rose-200 bg-rose-50/10'
            : canApprove
              ? 'border-brand-400 ring-2 ring-brand-100/50 shadow-md shadow-brand-50 bg-brand-50/5 animate-in fade-in zoom-in-95 duration-200'
              : 'border-slate-200 bg-slate-50/20 opacity-70'
        }`}
      >
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between mb-2.5 border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <div className={`p-1 rounded-lg ${
                isCompleted
                  ? isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  : canApprove ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[11px] font-extrabold ${
                isCompleted
                  ? isApproved ? 'text-emerald-800' : 'text-rose-800'
                  : 'text-slate-800'
              }`}>
                {title}
              </span>
            </div>

            {/* Status Badge */}
            {isCompleted ? (
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {approval.status}
              </span>
            ) : canApprove ? (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700 animate-pulse">
                <PenTool className="w-2 h-2" />
                Sign
              </span>
            ) : (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400">
                <Lock className="w-2 h-2" />
                Locked
              </span>
            )}
          </div>

          {/* Content Area */}
          {isCompleted ? (
            <div className="space-y-1.5 text-[10px] text-left">
              <div>
                <p className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">Decision Maker</p>
                <p className="font-bold text-slate-700 truncate">{approval.name}</p>
                <p className="text-[8px] text-slate-400 font-medium capitalize truncate">{approval.designation || 'Authority'}</p>
              </div>
              
              {approval.remarks && (
                <div>
                  <p className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">Remarks</p>
                  <p className="text-slate-600 font-medium italic line-clamp-2">"{approval.remarks}"</p>
                </div>
              )}

              <div>
                <p className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">Date</p>
                <p className="text-slate-500 font-medium text-[9px]">{new Date(approval.date).toLocaleDateString()}</p>
              </div>

              {/* Digital Sign */}
              <div className={`mt-2 p-1.5 rounded-lg border font-serif italic flex items-center justify-between ${
                isApproved 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                  : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                <div className="min-w-0">
                  <span className="text-[7px] block text-slate-400 font-sans font-bold uppercase tracking-wider not-italic leading-none mb-0.5">
                    Sign
                  </span>
                  <span className="font-bold font-signature text-xs font-serif select-none truncate block">{approval.sign || 'Signed'}</span>
                </div>
                <div className={`text-[7px] px-1 py-0.5 rounded font-sans not-italic font-black uppercase tracking-widest border shrink-0 scale-90 ${
                  isApproved 
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-700' 
                    : 'bg-rose-100 border-rose-200 text-rose-700'
                }`}>
                  OK
                </div>
              </div>
            </div>
          ) : canApprove ? (
            <div className="space-y-2 text-left">
              {/* Input Forms */}
              <div className="space-y-0.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                  Digital Sign <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={signature[type]}
                  onChange={(e) => setSignature((prev: any) => ({ ...prev, [type]: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 focus:ring-1 focus:ring-brand-500 outline-none font-semibold text-slate-700 bg-white"
                />
              </div>

              <div className="space-y-0.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                  Remarks <span className="text-red-500">*</span>
                </label>
                <textarea 
                  rows={1.5}
                  value={remarks[type]}
                  onChange={(e) => setRemarks((prev: any) => ({ ...prev, [type]: e.target.value }))}
                  placeholder="Comments..."
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 focus:ring-1 focus:ring-brand-500 outline-none text-slate-600 bg-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={isSaving || !signature[type] || !remarks[type]}
                  onClick={() => handleApproval(type, 'approved', remarks[type], signature[type])}
                  className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={isSaving || !signature[type] || !remarks[type]}
                  onClick={() => handleApproval(type, 'rejected', remarks[type], signature[type])}
                  className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[10px] font-bold bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded border border-red-100 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-3 h-3" />
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
              <Lock className="w-5 h-5 text-slate-300 mb-1" />
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Locked State</p>
              <p className="text-[8px] text-slate-400 font-medium mt-0.5 max-w-[120px] mx-auto leading-normal">{pendingMsg}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Photo Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Photo Before */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Picture Before</label>
          {data.pictureBefore ? (
            <div className="relative h-32 border border-slate-200 rounded-xl overflow-hidden bg-slate-100 group shadow-sm">
              <img src={data.pictureBefore} alt="Before" className="w-full h-full object-cover" />
              {!readOnly && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <label className="bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer transition-all shadow-sm">
                    Change
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, 'pictureBefore')} 
                    />
                  </label>
                  <button 
                    type="button" 
                    onClick={() => update((prev: any) => ({ ...prev, pictureBefore: null }))}
                    className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded transition-all shadow-sm cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            !readOnly ? (
              <label className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                <Camera className="w-8 h-8 text-slate-300 group-hover:text-brand-500 transition-colors mb-1.5" />
                <span className="text-xs text-slate-400 font-medium">Click to upload photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handlePhotoUpload(e, 'pictureBefore')} 
                />
              </label>
            ) : (
              <div className="h-32 border border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <Camera className="w-6 h-6 text-slate-300 mb-1" />
                <span className="text-xs italic text-slate-400">No picture before uploaded</span>
              </div>
            )
          )}
        </div>

        {/* Photo After */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Picture After</label>
          {data.pictureAfter ? (
            <div className="relative h-32 border border-slate-200 rounded-xl overflow-hidden bg-slate-100 group shadow-sm">
              <img src={data.pictureAfter} alt="After" className="w-full h-full object-cover" />
              {!readOnly && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <label className="bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer transition-all shadow-sm">
                    Change
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, 'pictureAfter')} 
                    />
                  </label>
                  <button 
                    type="button" 
                    onClick={() => update((prev: any) => ({ ...prev, pictureAfter: null }))}
                    className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded transition-all shadow-sm cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            !readOnly ? (
              <label className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                <Camera className="w-8 h-8 text-slate-300 group-hover:text-emerald-500 transition-colors mb-1.5" />
                <span className="text-xs text-slate-400 font-medium">Click to upload photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handlePhotoUpload(e, 'pictureAfter')} 
                />
              </label>
            ) : (
              <div className="h-32 border border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <Camera className="w-6 h-6 text-slate-300 mb-1" />
                <span className="text-xs italic text-slate-400">No picture after uploaded</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800">MOC Team Members</h3>
          {!readOnly && (
            <button 
              type="button"
              onClick={handleAddMember}
              className="flex items-center text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded border border-brand-100 cursor-pointer hover:bg-brand-100/50 transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Member
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.teamMembers?.length === 0 ? (
            <div className="col-span-full border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 italic bg-slate-50/50">
              No team members added
            </div>
          ) : (
            data.teamMembers?.map((member: any, idx: number) => (
              <div key={idx} className="flex gap-3 items-end bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group animate-in fade-in duration-200">
                <div className="flex-1 space-y-1">
                  <label className="block text-[8px] font-bold text-slate-400 uppercase">Name</label>
                  <input 
                    type="text" 
                    value={member.name}
                    disabled={readOnly}
                    onChange={(e) => handleUpdateMember(idx, 'name', e.target.value)}
                    className="w-full border-b border-slate-100 focus:border-brand-500 outline-none pb-0.5 text-xs text-slate-700 disabled:bg-transparent"
                    placeholder="Full Name"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block text-[8px] font-bold text-slate-400 uppercase">Designation</label>
                  <input 
                    type="text" 
                    value={member.designation}
                    disabled={readOnly}
                    onChange={(e) => handleUpdateMember(idx, 'designation', e.target.value)}
                    className="w-full border-b border-slate-100 focus:border-brand-500 outline-none pb-0.5 text-xs text-slate-700 disabled:bg-transparent"
                    placeholder="Position"
                  />
                </div>
                {!readOnly && (
                  <button 
                    type="button"
                    onClick={() => handleRemoveMember(idx)}
                    className="p-1 text-slate-300 hover:text-red-500 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Approvals and Checks */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="customerApp" 
              checked={data.customerApprovalRequired}
              disabled={readOnly}
              onChange={(e) => update((prev: any) => ({ ...prev, customerApprovalRequired: e.target.checked }))}
              className="w-4 h-4 accent-brand-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <label htmlFor="customerApp" className="text-xs font-semibold text-slate-700 cursor-pointer disabled:cursor-not-allowed">
              Customer Approval Required?
            </label>
          </div>
          
          {data.hodName && (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Assigned HOD: <strong className="text-slate-700">{data.hodName}</strong>
            </span>
          )}
        </div>

        {/* 5-Card Sequential Approval Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: HOD */}
          {renderApprovalCard(
            'hod',
            '1. HOD Approval',
            UserCheck,
            data.hodApproval,
            canApproveHod,
            data.status === 'Draft' 
              ? 'Awaiting MOC submission' 
              : `Awaiting HOD decision${data.hodName ? ` (Assigned: ${data.hodName})` : ''}`
          )}
          
          {/* Card 2: Plant Head */}
          {renderApprovalCard(
            'plant_head',
            '2. Plant Head Approval',
            Building2,
            data.plantHeadApproval,
            canApprovePlantHead,
            data.hodApproval?.status !== 'approved'
              ? 'Awaiting HOD approval to start PH review'
              : hasCustomPlantHead
                ? `Awaiting Plant Head decision (Authorized: ${authSettings.plantHead.join(', ')})`
                : 'Awaiting Plant Head decision (Authorized: Site Admin/Reviewers)'
          )}

          {/* Card 3: CEO */}
          {renderApprovalCard(
            'ceo',
            '3. CEO Approval',
            Briefcase,
            data.ceoApproval,
            canApproveCeo,
            data.plantHeadApproval?.status !== 'approved'
              ? 'Awaiting Plant Head approval to start CEO review'
              : hasCustomCeo
                ? `Awaiting CEO decision (Authorized: ${authSettings.ceo.join(', ')})`
                : 'Awaiting CEO decision (Authorized: Site Admin/Reviewers)'
          )}

          {/* Card 4: EHS */}
          {renderApprovalCard(
            'ehs',
            '4. EHS Approval',
            Activity,
            data.ehsApproval,
            canApproveEhs,
            data.ceoApproval?.status !== 'approved'
              ? 'Awaiting CEO approval to start EHS review'
              : hasCustomEhs
                ? `Awaiting EHS decision (Authorized: ${authSettings.ehs.join(', ')})`
                : 'Awaiting EHS decision (Authorized: Compliance/Admin)'
          )}

          {/* Card 5: QA */}
          {renderApprovalCard(
            'qa',
            '5. QA Approval',
            ShieldCheck,
            data.qaApproval,
            canApproveQa,
            data.ehsApproval?.status !== 'approved'
              ? 'Awaiting EHS approval to start QA review'
              : hasCustomQa
                ? `Awaiting QA decision (Authorized: ${authSettings.qa.join(', ')})`
                : 'Awaiting QA decision (Authorized: Compliance/Admin)'
          )}
        </div>
      </div>
    </div>
  );
};

export default Section3Implementation;
