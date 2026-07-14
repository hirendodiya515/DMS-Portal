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
    version: '3.6.0',
    date: '14 July 2026',
    title: 'Internal & External Issues (SWOT/PESTLE) Upgrades & Excel Export',
    changes: [
      'Upgraded Internal & External Issues (SWOT) with collapsible PESTLE Profile Recharts visualizing category and PESTLE distributions',
      'Implemented standard-aware local AI (Ollama gemma4:e4b) suggestions auto-populating SWOT category, PESTLE category, impact, and standard ISO mappings (e.g. mapping GHG emissions to ISO 14001)',
      'Added interactive SWOT 2x2 Matrix Board View representing classical quadrants layout with center SWOT axis intersections',
      'Integrated Management of Change (MOC) linking to associate SWOT issues with active MOC workflows or document files, with direct navigation and unlinking capabilities',
      'Engineered robust Risk and Opportunity synchronization ensuring deletions in the Strategic Risk Register automatically revert SWOT issue statuses to "No Further Action"',
      'Fixed database query failures by stripping custom displayId properties and converting empty date strings to null to eliminate DateTimeParseError on PostgreSQL',
      'Defaulted the SWOT module layout to Tabular View and removed Grid View for a clean, simplified navigation experience',
      'Added a stylized Excel export button downloading comprehensive SWOT details (including linked risks, MOCs, PESTLE tags, and review logs)'
    ]
  },
  {
    version: '3.5.0',
    date: '30 June 2026',
    title: 'Product Deviation Portal Upgrades & Interactive User Guidelines',
    changes: [
      'Integrated Quantity Under Deviation field mapped in both pcs and sqm to track physical defect volume',
      'Added CEO and Plant Head joint/parallel approvals stage allowing either authority to advance the workflow',
      'Enabled optional file attachments for HOD, CEO, Plant Head, and Quality Head sign-offs with Base64 document persistence',
      'Added optional containment evidence uploads for responsible persons with automatic multi-person file concatenation',
      'Engineered secure administrator-only soft-delete capability that preserves sequential number auditing without sequence gaps',
      'Rendered official standard document control headers (Doc no.: MR/L4/013, Rev date: 01.07.2026) in PDF report exports',
      'Designed an interactive User Guide modal simulating Login layout, workspace headers, metric counters, creation form hover tooltips, and email alerts',
      'Upgraded page and header widths to max-w-7xl, embedding user profiles and logout buttons for consistent desktop navigation'
    ]
  },
  {
    version: '3.4.0',
    date: '24 June 2026',
    title: 'Local AI Agent Integration & Streaming Copilot',
    changes: [
      'Launched the DMS AI Copilot, a floating interactive chat assistant processed 100% locally and privately',
      'Configured real-time chunked HTTP streaming to render AI responses word-by-word in the UI for a faster user experience',
      'Engineered a dynamic model detection system that retrieves and displays the active local model (e.g. Gemma 2, Llama 3) configured on the Ollama service',
      'Built a document indexing engine that extracts and vectorizes content from uploaded PDF and Word documents',
      'Added dynamic page routing context, auto-injecting relevant starter suggestions based on the module the user is viewing',
      'Integrated an admin manual trigger to rebuild the knowledge base index'
    ]
  },
  {
    version: '3.3.0',
    date: '19 June 2026',
    title: 'Calibration Management Enhancements & Alert Consolidation',
    changes: [
      'Consolidated daily calibration alert notifications by grouping instruments by Department and Status (Upcoming vs Overdue) into a single summary email',
      'Formatted consolidated emails with clean screen-friendly HTML tables and distinct urgency color themes',
      'Restructured department view list header to display "Calibration register - [Department Name]" and added standard Document Number identifier (MR/L4/015)',
      'Suppressed daily upcoming/overdue calibration alerts for equipment marked under "Maintenance" or "Inactive" status',
      'Updated equipment list table, detail display, and history records to format dates to dd-mmm-yy format (e.g. 19-Jun-26)',
      'Rendered grey "Inactive" calibration status badges on the equipment dashboard for maintenance/inactive instruments'
    ]
  },
  {
    version: '3.2.0',
    date: '18 June 2026',
    title: 'Interested Parties Merging, Responsible Department Mapping & Global Search',
    changes: [
      'Engineered an intelligent visual merging UX for duplicate Interested Party entries using dynamic HTML rowSpan grouping',
      'Added a new "Responsible" column mapping interested party needs to specific departments loaded from settings',
      'Integrated real-time search filtering on both SWOT analysis issues and Interested Parties tables',
      'Added a datalist suggestion list to the Party Name input in the form to prevent spelling errors during multiple need entries',
      'Enforced delete confirmation security prompts on interested parties aligned with safety requirements',
      'Completed full API integration for deleting interested party records from the Postgres database',
      'Created a Layout Selector Switch on the SWOT tab to toggle between SWOT Grid View and a high-fidelity SWOT Tabular View',
      'Integrated ISO Standard and IMS Status dropdown filters on the SWOT page'
    ]
  },
  {
    version: '3.1.0',
    date: '10 June 2026',
    title: 'Product Deviation Ecosystem & Searchable Operator Assignment',
    changes: [
      'Launched the standalone Product Deviation portal built on React, TypeScript, and Tailwind CSS v4',
      'Configured a custom static hosting configuration on a dedicated port (5176) sharing the main API service and database',
      'Implemented a searchable selection dropdown with dynamic name and email filtering for assigning responsible operators (supporting 50+ users)',
      'Added high-visibility selected user pills with direct removal click triggers to streamline operator assignments',
      'Upgraded the dashboard with a custom search filter defensive engine to eliminate runtime script exceptions on null database properties',
      'Standardized corporate branding by replacing header icons with high-resolution Borosil Logo assets'
    ]
  },
  {
    version: '3.0.0',
    date: '21 May 2026',
    title: 'Management of Change (MOC) Ecosystem & Multi-Tier Approvals',
    changes: [
      'Launched the full-scale Management of Change (MOC) module featuring automated sequential change control tracking',
      'Engineered a strict 7-stage sequential validation pipeline: Creator Raise -> HOD Review -> Plant Head -> CEO Approval -> EHS Clearance -> QA Approval -> Finalized',
      'Created custom Authorized Approver settings allowing administrators to dynamically delegate email accounts for Plant Head, CEO, EHS, and QA roles',
      'Implemented the Change Audit & Activity Register tab rendering high-density, chronological system audit trails of all creation, submission, approval, rejection, and deletion actions',
      'Designed a premium, flat Overview interface using ultra-compact horizontal stage pipelines, flat stats grids, and low-profile inline launcher bars',
      'Added secure cascading deletion controls strictly restricted to administrators with regulatory audit log preservation'
    ]
  },
  {
    version: '2.9.0',
    date: '15 April 2026',
    title: 'Customer Feedback Ecosystem & Advanced Analytics',
    changes: [
      'Digitalized "BRL Representative Name" integration across the full-stack ecosystem (UI Form, Backend, and Database)',
      'Upgraded the Satisfaction Dashboard with an interactive Comparison Line Chart and context-aware tooltips',
      'Implemented real-time live search logic filtering by Company, Contact, and BRL Representative',
      'Introduced a professional-grade PDF Report layout with persistent headers and structured data grids',
      'Launched the "Export All" CSV engine for comprehensive feedback data extraction and offline analysis',
      'Engineered an intelligent rolling-average algorithm for the 6-month Satisfaction Trend visualizer',
      'Optimized the Feedback UI layout for balanced field grouping and improved data entry experience'
    ]
  },
  {
    version: '2.8.0',
    date: '10 April 2026',
    title: 'Process Deviation Management & 5-Step Approval Workflow',
    changes: [
      'Launched the specialized Process Deviation module with isolated data architecture and dedicated lifecycle tracking',
      'Implemented a robust 5-step digital approval workflow: Functional Head -> QA Head -> Plant Head -> Process Head -> CEO',
      'Introduced dynamic field rebranding: "Parameter Under Deviation" and "Specification of Parameter" for precise process documentation',
      'Integrated department-aware logic to automatically route deviations to the correct Functional Head based on User Management data',
      'Enabled comprehensive Audit Trails capturing every signature, remark, and state transition with millisecond precision',
      'Automated high-priority workflow email alerts for each stage to ensure seamless handovers between departments',
      'Upgraded localized PDF report generation to support the new 5-tier signature blocks and rebranding'
    ]
  },
  {
    version: '2.7.0',
    date: '09 April 2026',
    title: 'Internal Audit NC Tracking & Workflow Automation',
    changes: [
      'Launched a centralized NC Tracking Dashboard with real-time analytics for department-wise distribution and status monitoring',
      'Implemented a secure multi-stage closure workflow: Auditee submission -> Auditor review -> Final Closure or Resend for correction',
      'Added a full NC detail "Eye" view to provide a transparent audit trail with complete observation, requirement, and action history',
      'Optimized the module for all screen sizes with a responsive, scrollable closure modal and pinned action footers',
      'Enhanced data visualization with interactive charts for status breakdown and audit plan-wise trends',
      'Refined the UI with professional styling, including calibrated border radius and opaque sticky headers for seamless scrolling'
    ]
  },
  {
    version: '2.6.0',
    date: '26 March 2026',
    title: 'Competency & Training Ecosystem Expansion',
    changes: [
      'Introduced a new digital Training Attendance form with integrated Feedback & Department tracking',
      'Launched the Training Dashboard for real-time monitoring of personnel development metrics',
      'Implemented "Plan vs Actual" matrix for annual training oversight and compliance tracking',
      'Added a comprehensive Analytics page with department-wise performance and feedback breakdown',
      'Created a new Competency Settings page to delegate "God-Mode" administrative rights to selected HR personnel',
      'Enforced strict department-level data isolation for standard managers and viewers'
    ]
  },
  {
    version: '2.5.0',
    date: '21 March 2026',
    title: 'Product Deviation & Workflow Architecture',
    changes: [
      'Added the Product Deviation portal where deviations can be formally raised by quality personnel',
      'Implemented structured task assignment approvals sequentially requiring Responsible, Marketing, Plant Head, and Quality Head signatures',
      'Integrated dynamic HTML mail triggers seamlessly dispatching targeted updates across each workflow action',
      'Configured an intelligent auto-mail reminder scheduling system globally adjustable from system settings',
      'Enabled localized PDF report generation and download options natively for Product Deviations',
      'Upgraded User Management capabilities allowing Administrators to dynamically reset application passwords and emails'
    ]
  },
  {
    version: '2.4.0',
    date: '19 March 2026',
    title: 'AI Integration for Internal Audits',
    changes: [
      'Introduced Gemini AI integration in the Perform Audit module',
      'Added smart AI-based ISO Clause recognition directly from audit observations',
      'Added grouped AI suggestions for automatically drafting comprehensive NC Statements, Requirements, and precise Clauses',
      'Optimized AI query processing for lightning-fast suggestion generation'
    ]
  },
  {
    version: '2.3.0',
    date: '17-Mar-2026',
    title: 'Customer Feedback Integration',
    changes: [
      'Integrated customer feedback system with this DMS',
      'Customer can log their feedback and rating using the link https://brl-customer-feedback.vercel.app/ and the data will be stored in cloud server',
      'Every midnight the score will be fetched with DMS and update the latest changes. You can also manually fetch the data using manual button',
      'Customer statistics available in tab customer-feedback'
    ]
  },
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
                    v3.6.0
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
