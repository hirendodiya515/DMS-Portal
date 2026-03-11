import { useState } from 'react';
import { 
  Info, 
  Mail, 
  User, 
  Code, 
  Server, 
  Shield, 
  Cpu,
  ChevronDown,
  History,
  CheckCircle2,
  Star
} from 'lucide-react';

const changeLog = [
  {
    version: '2.2.0',
    date: '08 March 2026',
    title: 'Process Failure Mode and Effects Analysis (PFMEA) Integration',
    changes: [
      'Added comprehensive PFMEA module for risk management and failure mode tracking',
      'Implemented "All Processes (Aggregate View)" for global portfolio monitoring across all projects',
      'Created Summary Dashboard with interactive Risk Level & RPN distribution charts and progress tracking',
      'Built a robust FMEA Worksheet with inline editing, row duplication, and automatic RPN calculation',
      'Developed an interactive 5x5 Risk Matrix Heat Map to visually plot and analyze failure modes',
      'Added History tab for complete traceability, including Revision Logs, Action Logs, and detailed Audit Trails',
      'Integrated Role-Based Access Control (RBAC) to securely manage view, edit, and delete permissions',
      'Introduced floating toast notifications for improved user feedback during worksheet operations'
    ]
  },
  {
    version: '2.1.0',
    date: '01 March 2026',
    title: 'Objective page re-structure',
    changes: [
      'Totally re-designed objective page with tabs',
      'High-level summary and sparkline card added in Highlight page',
      'Objective and tracking page is all about the individual objective',
      'Log page added to track the each change in Objective page',
      'Sub-objective is now supported for each objective where, target and actual value can aggregate',
      'Objetctive will be Auto assign to Department head/Reviewer',
      'About page added in DMS'
    ]
  },
  {
    version: '2.0.0',
    date: 'March 2026',
    title: 'Major Architecture Upgrade & UI Revamp',
    changes: [
      'Complete redesign of the User Interface for a more modern look',
      'Introduced advanced Objective Filters across multiple tabs',
      'Revamped Attendance Portal UI with celebratory animations',
      'Added Quality Policy document viewing access controls',
      'Enhanced risk assessment mitigation views',
      'Added Equipment Mail Alert Feature for upcoming calibrations',
      'Improved summary tooltips for stacked bubble rejection charts',
      'Implemented auto-fit functionality for rejection forecast',
      'Major performance improvements and bug fixes across the application'
    ]
  },
  {
    version: '1.5.0',
    date: 'February 2026',
    title: 'Enhanced Reporting & Security',
    changes: [
      'Added comprehensive Audit Logs page',
      'Implemented role-based access control (RBAC) across departments',
      'Introduced new Competency & Training modules',
      'Added Support for HIRA, EAA, and QRA risk assessments',
      'Fixed various unique constraint violations in equipment entry'
    ]
  },
  {
    version: '1.0.0',
    date: 'January 2025',
    title: 'Initial Release',
    changes: [
      'Initial launch of the Document Management System (DMS)',
      'Basic document tracking and version control',
      'Department and Organization Chart views',
      'Flowchart builder integration',
      'Basic reporting functionality'
    ]
  }
];

export default function AboutPage() {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(changeLog[0].version);

  const toggleVersion = (version: string) => {
    if (expandedVersion === version) {
      setExpandedVersion(null);
    } else {
      setExpandedVersion(version);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col items-center justify-center space-y-4 text-center py-8">
        <div className="bg-blue-600 p-4 rounded-full text-white shadow-lg shadow-blue-500/30">
          <Info className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">About DMS Portal</h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          A comprehensive Document Management System designed to streamline organizational workflows, 
          manage risks, track objectives, and ensure compliance with international standards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Developer Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-slate-800">Developer Information</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-slate-100 p-3 rounded-lg text-slate-600">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Lead Developer</p>
                <p className="text-lg font-semibold text-slate-900">Hiren Dodiya</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-slate-100 p-3 rounded-lg text-slate-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Contact Email</p>
                <a href="mailto:Hirendodiya515@gmail.com" className="text-lg font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Hirendodiya515@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Current Version</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold border border-emerald-200">
                    v2.2.0
                  </span>
                  <span className="text-sm text-emerald-600 font-medium">Latest Release</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-slate-800">System Analytics</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-indigo-500" />
                <span className="font-medium text-slate-700">Security Core</span>
              </div>
              <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium">Enterprise Grade</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-slate-700">Architecture</span>
              </div>
              <span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded-md font-medium">React + TypeScript</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-teal-500" />
                <span className="font-medium text-slate-700">Uptime Guarantee</span>
              </div>
              <span className="text-sm bg-teal-100 text-teal-700 px-2 py-1 rounded-md font-medium">99.9%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Version History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <History className="w-7 h-7 text-blue-600" />
            <h2 className="text-2xl font-semibold text-slate-800">Version History & Changelog</h2>
          </div>
          <p className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Track our journey
          </p>
        </div>

        <div className="space-y-4">
          {changeLog.map((log, index) => {
            const isExpanded = expandedVersion === log.version;
            const isLatest = index === 0;

            return (
              <div 
                key={log.version} 
                className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                  isExpanded ? 'border-blue-200 shadow-md ring-1 ring-blue-100' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <button
                  onClick={() => toggleVersion(log.version)}
                  className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                    isExpanded ? 'bg-blue-50/50' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-2 ${
                      isLatest 
                        ? 'bg-blue-100 text-blue-700 border-blue-200' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {log.version}
                      {isLatest && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{log.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{log.date}</p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-full transition-transform duration-300 ${
                    isExpanded ? 'bg-blue-100 text-blue-600 rotate-180' : 'text-slate-400'
                  }`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>
                
                <div 
                  className={`transition-all duration-300 ease-in-out origin-top ${
                    isExpanded ? 'max-h-[1000px] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-95'
                  }`}
                >
                  <div className="p-6 bg-white border-t border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">What's New in {log.version}</h4>
                    <ul className="space-y-3">
                      {log.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-slate-600 leading-relaxed">{change}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {isLatest && (
                      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">Looking forward</h4>
                        <p className="text-sm text-blue-600/80">
                          We are constantly improving. To suggest features or report issues, please contact the developer via the email provided above. Future updates will focus on deeper AI integrations and enhanced analytical tools.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
