import { useState } from 'react';
import { X, BookOpen, LayoutDashboard, FilePlus, GitFork, FileDown, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'dashboard' | 'create' | 'workflow' | 'pdf';

export default function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Portal User Guide & Tutorial</h2>
              <p className="text-xs text-orange-100">Step-by-step instructions for the Product Deviation Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard & Login
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'create'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FilePlus className="w-4 h-4" />
            Creating Deviation
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'workflow'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitFork className="w-4 h-4" />
            Approval Flow
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'pdf'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileDown className="w-4 h-4" />
            Viewing & Exporting
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700 custom-scrollbar text-sm">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Login Simulation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                    1. Portal Authentication
                  </h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Log in using your DMS credentials. In case you already don't have DMS credentials, you can contact QA team for get credentials.
                  </p>
                </div>
                <div className="w-full md:w-64 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated Login Form</div>
                  <div className="space-y-1">
                    <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                    <div className="h-8 bg-slate-50 rounded-lg border border-slate-200 px-2 flex items-center text-[10px] text-slate-500">hiren.dodiya@borosil.com</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                    <div className="h-8 bg-slate-50 rounded-lg border border-slate-200 px-2 flex items-center text-[10px] text-slate-300">••••••••</div>
                  </div>
                  <div className="h-8 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm shadow-orange-100 cursor-default">Sign In</div>
                </div>
              </div>

              {/* Header Details Simulation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <LayoutDashboard className="w-4 h-4 text-orange-500" />
                    2. Workspace Header & Create Actions
                  </h3>
                  <p className="text-slate-655 text-xs leading-relaxed">
                    Your profile details are pinned in the top navigation bar. Click the primary orange button to navigate straight to the new deviation form.
                  </p>
                </div>
                <div className="w-full md:w-80 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated Header Controls</div>
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs">h</div>
                      <div className="text-left">
                        <div className="text-[9px] font-bold text-slate-800 leading-tight">hiren dodiya</div>
                        <div className="text-[7px] text-slate-450 font-semibold uppercase tracking-wider">DEPT_HEAD | QUALITY</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1.5 bg-orange-600 text-white text-[9px] font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-default hover:bg-orange-700 transition">
                      + New Deviation
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics simulation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-orange-500" />
                    3. Monitoring Deviation Counters
                  </h3>
                  <p className="text-slate-655 text-xs leading-relaxed">
                    Instantly monitor active and archived deviations of your plant database. Statistics reload automatically upon new approval updates.
                  </p>
                </div>
                <div className="w-full md:w-80 grid grid-cols-2 gap-2 shrink-0">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-16">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">TOTAL DEVIATIONS</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-black text-slate-800">11</span>
                      <span className="px-1 bg-slate-100 text-slate-600 text-[7px] font-bold rounded">All time</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-16">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE (OPEN)</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-black text-rose-600">2</span>
                      <span className="px-1 bg-rose-50 text-rose-600 text-[7px] font-bold rounded">Requires action</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Table Row Simulation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <LayoutDashboard className="w-4 h-4 text-orange-500" />
                    4. Dashboard Logs & Creator vs Initiator Details
                  </h3>
                  <p className="text-slate-655 text-xs leading-relaxed">
                    The deviation log lists the <strong>Created By</strong> account (logged-in system user who submitted the form) alongside the <strong>Initiator Name</strong> (text name input).
                  </p>
                </div>
                <div className="w-full bg-white p-3 rounded-xl border border-slate-200 shadow-sm overflow-x-auto shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Simulated Row Data</div>
                  <table className="min-w-full text-[10px] text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[8px] tracking-wider">
                        <th className="text-left pb-1.5 font-bold">Sr No. / Line</th>
                        <th className="text-left pb-1.5 font-bold">Created By</th>
                        <th className="text-left pb-1.5 font-bold">Initiator Name</th>
                        <th className="text-left pb-1.5 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="align-middle">
                        <td className="py-2">
                          <span className="font-bold text-slate-800">PD-2026-06-0002</span>
                          <span className="text-[8px] text-slate-400 block">Line: SG#1</span>
                        </td>
                        <td className="py-2">Admin User</td>
                        <td className="py-2">Hiren D</td>
                        <td className="py-2">
                          <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">CLOSED</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="space-y-6">
              {/* Form Fields Simulation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FilePlus className="w-4 h-4 text-orange-500" />
                    Form Inputs Layout (Hover over fields for tooltips)
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Hover your mouse cursor over any field input box below to see its exact meaning and instructions.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                  {/* Line selector */}
                  <div className="relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Production Line *</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-[11px] font-medium flex justify-between items-center cursor-help">
                      Select line...
                      <span className="text-slate-400 text-[9px]">▼</span>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed animate-fade-in">
                      🏭 <strong>Production Line</strong>: Specify the production line where the product deviation was noticed.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* Initiator Name */}
                  <div className="relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Initiator Name *</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-[11px] font-medium cursor-help">
                      Enter initiator name...
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      👤 <strong>Initiator Name</strong>: Input the name of the person initiating the deviation report.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Start Date *</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-400 text-[11px] font-medium flex justify-between cursor-help">
                      Select start date...
                      <span className="text-slate-400">📅</span>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      📅 <strong>Start Date</strong>: When the problem started.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">End Date *</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-400 text-[11px] font-medium flex justify-between cursor-help">
                      Select end date...
                      <span className="text-slate-400">📅</span>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      📅 <strong>End Date</strong>: When the problem ended. If the defect occurred and ended on the same day, select the same date as the start date.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* Quantity Pcs */}
                  <div className="relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Quantity Under Deviation (pcs)</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-400 text-[11px] font-medium cursor-help">
                      e.g. 100 (Optional)
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      🔢 <strong>Quantity in Pieces</strong>: The total number of items/pieces affected by this deviation (optional).
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* Nature of Deviation */}
                  <div className="relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Nature of Deviation *</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-400 text-[11px] font-medium cursor-help">
                      Defect summary (e.g. Surface line in glass)
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      📝 <strong>Nature of Deviation</strong>: Brief one-line summary of the physical defect encountered.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* Detailed Description */}
                  <div className="sm:col-span-2 relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Detailed Description *</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-455 text-[11px] font-medium min-h-[50px] cursor-help">
                      Add details here like quantity of defect, intensity, location, glass size & thickness, customer name, etc.
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      🔍 <strong>Detailed Description</strong>: Provide as many details as possible. Specify the defect quantity, intensity, layout location, customer name, glass size, thickness, or other special parameters.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* Assigned Responsible Persons */}
                  <div className="sm:col-span-2 relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Assign Responsible Persons (can add upto 3) *</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2 cursor-help">
                      <div className="text-slate-400 text-[11px]">Select responsible person...</div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg text-[9px] font-bold text-orange-700">
                          Hiren Dodiya
                          <span className="text-slate-400 font-bold">&times;</span>
                        </span>
                      </div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      👥 <strong>Assign Responsibles</strong>: Select person here who is responsible for the define the root cause, containment, corrective actions, and disposal actions. you can select upto 3 person here.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* Simulated Attachments */}
                  <div className="sm:col-span-2 relative group space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Optional Attachments</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-help bg-slate-50/50">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xl">📤</span>
                        <span className="text-[10px] font-bold text-slate-700">Upload diagrams or defect photos</span>
                        <span className="text-[8px] text-slate-400 font-medium">PDF, PNG, JPG, XLS (Max 5MB)</span>
                      </div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      📎 <strong>Attachments</strong>: Upload photos or letters associated with the deviation (optional).
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>

                {/* Simulated Submit Button */}
                <div className="flex justify-center pt-2">
                  <div className="relative group">
                    <button 
                      type="button" 
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-help shadow-md shadow-orange-100"
                    >
                      <span>Create Deviation</span>
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-lg text-center font-medium leading-relaxed">
                      🚀 <strong>Submit</strong>: Once you fill all details correctly, click this button to submit. It will dispatch emails immediately and route the record to selected responsibles to write the Action Plans.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated Mail Notification Card */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="text-orange-500">📧</span>
                    Email Notification Alert Template
                  </h3>
                  <p className="text-slate-655 text-xs leading-relaxed">
                    This is how the email alert will be triggered immediately after you click on the submit button:
                  </p>
                </div>
                
                <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs shrink-0 mx-auto">
                  {/* Email Header */}
                  <div className="bg-slate-800 text-white p-3.5 flex justify-between items-center">
                    <span className="font-bold text-[10px] tracking-wide uppercase">Borosil DMS Alert</span>
                    <span className="text-[8px] text-slate-400">Just Now</span>
                  </div>
                  {/* Email Body */}
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 block">Subject:</span>
                      <span className="font-bold text-slate-800 block text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                        🚨 Action Required: Product Deviation PD-2026-06-0002 has been logged
                      </span>
                    </div>
                    
                    <p className="text-slate-655 text-[10px] leading-relaxed">
                      Dear <strong>Hiren Dodiya</strong>,
                      <br />
                      A new product deviation record has been created by <strong>Admin User</strong> on Line <strong>SG#1</strong>. You are assigned as a responsible person for defining the Action Plan.
                    </p>
                    
                    {/* Action Button */}
                    <div className="text-center pt-2">
                      <button 
                        type="button"
                        onClick={(e) => e.preventDefault()}
                        className="inline-block bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-[9px] shadow-sm shadow-orange-100 hover:bg-orange-700 transition"
                      >
                        Open Deviation details & Sign Action Plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {/* Workflow Step Simulation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-orange-500" />
                    Approval Workflow Tracker
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Deviations are routed sequentially. Approvers can upload optional files (photos, Excel files, PDF reports) alongside sign-off remarks.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Action Plan Sign-off</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Assigned responsible persons submit Root Cause & Disposal Action</span>
                      </div>
                      <span className="bg-rose-50 text-rose-700 text-[8px] font-black px-2 py-0.5 rounded-md border border-rose-200 tracking-wide uppercase shrink-0">OPEN</span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Marketing & HOD Review</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Review business impact. Can be bypassed in setting configuration</span>
                      </div>
                      <span className="bg-orange-50 text-orange-700 text-[8px] font-black px-2 py-0.5 rounded-md border border-orange-200 tracking-wide uppercase shrink-0">PENDING MARKETING</span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Plant Head & CEO Sign-off</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Parallel sign-off stage. Either authority signatures advances workflow</span>
                      </div>
                      <span className="bg-amber-50 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-md border border-amber-200 tracking-wide uppercase shrink-0">PENDING PLANT HEAD</span>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold flex items-center justify-center text-[10px] shrink-0">4</span>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Quality Head Closure</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Final check and signature marks deviation as archived</span>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-md border border-emerald-200 tracking-wide uppercase shrink-0">CLOSED</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mail Alerts Explanation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="text-orange-500">📧</span>
                    Mail Alerts Notification System
                  </h3>
                  <p className="text-slate-655 text-xs leading-relaxed">
                    The portal triggers automated corporate email alerts at key status transitions to keep all stakeholders updated:
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
                    <span className="font-bold text-slate-800 block text-[10px]">1. New Deviation Alert</span>
                    <span className="text-slate-500 block text-[9px] leading-relaxed">Sent to all <strong>Responsible Persons</strong> immediately when a deviation is created, notifying them to complete the Action Plan.</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
                    <span className="font-bold text-slate-800 block text-[10px]">2. Review & Sign-off Alert</span>
                    <span className="text-slate-500 block text-[9px] leading-relaxed">Sent to the <strong>Marketing/HOD</strong> reviewer (if enabled) or <strong>Plant Head & CEO</strong> (parallelly) when their active approvals are required.</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
                    <span className="font-bold text-slate-800 block text-[10px]">3. Quality Head Audit Alert</span>
                    <span className="text-slate-500 block text-[9px] leading-relaxed">Sent to the <strong>Quality Head</strong> once preceding approvals are registered, calling for final checking and sign-off.</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
                    <span className="font-bold text-slate-800 block text-[10px]">4. Closure Notice Alert</span>
                    <span className="text-slate-500 block text-[9px] leading-relaxed">Sent to the <strong>Initiator/Creator</strong> and all sign-off authorities once the Quality Head closes the deviation.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="space-y-6">
              {/* PDF simulation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <FileDown className="w-4.5 h-4.5 text-orange-500" />
                    Viewing and PDF Exports
                  </h3>
                  <p className="text-slate-655 text-xs leading-relaxed">
                    Closed deviations show active PDF export buttons. Click the green PDF button in the dashboard or details page to compile details and signature tables.
                  </p>
                </div>
                <div className="w-full md:w-80 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated Row Action Trigger</div>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-default hover:bg-slate-100 transition">
                      👁️ View
                    </div>
                    <div className="flex-1 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5 cursor-default hover:bg-emerald-100 transition shadow-sm">
                      📄 PDF
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
