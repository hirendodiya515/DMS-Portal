import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import api from '../../lib/api';

interface AuditReportViewerProps {
  reportId: string;
  onClose: () => void;
  autoPrint?: boolean;
}

interface AuditData {
  id: string;
  date: string;
  schedule: {
      department: string;
      scope: string;

      auditors: { name: string }[];
  };
  auditees?: { name: string }[];
  entries: {
      id: string;
      title: string;
      docNumber: string;
      observation: string;
      clause: string;
      status: string;

      ncStatement?: string;
      requirement?: string;
      targetDate?: string;
  }[];
}

export default function AuditReportViewer({ reportId, onClose, autoPrint = false }: AuditReportViewerProps) {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/audit-executions/${reportId}`);
      setData(res.data);
    } catch (error) {
      console.error('Failed to load report:', error);
      alert('Failed to load report');
    } finally {
        setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Auto-trigger print when autoPrint is true and data is loaded
  useEffect(() => {
    if (autoPrint && data && !loading) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [autoPrint, data, loading]);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading Report...</div>;
  if (!data) return <div className="p-12 text-center text-red-500">Report not found</div>;


  return (
    <>
      <style>{`
        @media print {
          /* Hide summary page */
          .audit-summary-page {
            display: none !important;
          }
          
          /* Page setup */
          @page {
            size: A4 portrait;
            margin: 15mm 10mm;
          }
          
          /* Hide browser headers and footers */
          body {
            margin: 0;
            padding: 0;
          }
          
          /* Ensure content fits properly */
          html, body {
            width: 210mm;
            height: 297mm;
          }
        }
      `}</style>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-0">
      <div className="bg-white w-full max-w-4xl h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col print:h-auto print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Toolbar - Hidden in Print */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 print:hidden sticky top-0 z-10">
            <h2 className="font-semibold text-slate-800">Audit Report Viewer</h2>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Download / Print
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Report Content - A4 Style */}
        <div className="p-8 print:p-0">
            <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] print:min-h-0">
                {/* Header */}
                <div className="border-2 border-slate-900 mb-6">
                    <div className="grid grid-cols-12 divide-x-2 divide-slate-900">
                        <div className="col-span-3 p-4 flex items-center justify-center">
                            <img src="/logo.png" alt="Borosil Renewables" className="max-h-16 object-contain" />
                        </div>
                        <div className="col-span-6 p-2 flex flex-col justify-center items-center text-center">
                            <h1 className="text-xl font-bold uppercase tracking-wide">Internal Audit Report</h1>
                            <p className="text-sm font-semibold text-slate-600 uppercase">ISO 9001:2015 / 14001:2015 / 45001:2018</p>
                        </div>
                        <div className="col-span-3 text-xs divide-y-2 divide-slate-900 flex flex-col justify-center">
                            <div className="p-1 px-2">
                                <span className="font-bold block">Doc No: MR/L4/005</span>
                            </div>
                            <div className="p-1 px-2">
                                <span className="font-bold block">Issue No./Date: 01/12.02.2020</span>
                            </div>
                            <div className="p-1 px-2">
                                <span className="font-bold block">Rev No: 01</span>
                            </div>
                            <div className="p-1 px-2">
                                <span className="font-bold block">Rev. Date: 04.12.2025</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit Details */}
                <div className="mb-6">
                     <table className="w-full border-collapse border border-slate-400 text-sm">
                        <tbody>
                            <tr>
                                <th className="border border-slate-400 bg-slate-100 p-2 text-left w-1/4">Department</th>
                                <td className="border border-slate-400 p-2 w-1/4">{data.schedule.department}</td>
                                <th className="border border-slate-400 bg-slate-100 p-2 text-left w-1/4">Audit Date</th>
                                <td className="border border-slate-400 p-2 w-1/4">{new Date(data.date).toLocaleDateString()}</td>
                            </tr>
                            <tr>
                                <th className="border border-slate-400 bg-slate-100 p-2 text-left">Auditee</th>
                                <td className="border border-slate-400 p-2" colSpan={3}>
                                    {data.auditees && data.auditees.length > 0 
                                        ? data.auditees.map(a => a.name).join(', ') 
                                        : data.schedule.department}
                                </td>
                            </tr>
                             <tr>
                                <th className="border border-slate-400 bg-slate-100 p-2 text-left">Auditors</th>
                                <td className="border border-slate-400 p-2" colSpan={3}>
                                    {data.schedule.auditors?.map(a => a.name).join(', ') || 'N/A'}
                                </td>
                            </tr>
                        </tbody>
                     </table>
                </div>

                {/* Findings Table */}
                <div className="mb-8">
                    <h3 className="font-bold text-slate-800 mb-2 uppercase text-sm border-b border-slate-800 pb-1">Audit Observations</h3>
                    <table className="w-full border-collapse border border-slate-400 text-sm">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-400 p-2 w-12 text-center">#</th>
                                <th className="border border-slate-400 p-2 text-left w-1/6">Title</th>
                                <th className="border border-slate-400 p-2 text-left w-24">Doc No</th>
                                <th className="border border-slate-400 p-2 text-left">Observation / Finding</th>
                                <th className="border border-slate-400 p-2 w-24 text-left">Clause</th>
                                <th className="border border-slate-400 p-2 w-24 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.entries.filter(e => e.title).map((entry, idx) => (
                                <tr key={entry.id}>
                                    <td className="border border-slate-400 p-2 text-center align-top">{idx + 1}</td>
                                    <td className="border border-slate-400 p-2 align-top font-semibold">{entry.title}</td>
                                    <td className="border border-slate-400 p-2 align-top text-xs">{entry.docNumber}</td>
                                    <td className="border border-slate-400 p-2 align-top whitespace-pre-wrap">{entry.observation}</td>
                                    <td className="border border-slate-400 p-2 align-top">{entry.clause}</td>
                                    <td className="border border-slate-400 p-2 text-center align-top font-bold">
                                        {entry.status}
                                    </td>
                                </tr>
                            ))}
                            {data.entries.filter(e => e.title).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="border border-slate-400 p-8 text-center text-slate-500 italic">No observations recorded.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* NC Details Table */}
                {data.entries.some(e => e.status === 'NC') && (
                    <div className="mb-8">
                        <h3 className="font-bold text-slate-800 mb-2 uppercase text-sm border-b border-slate-800 pb-1">Non-Conformity Details</h3>
                        <table className="w-full border-collapse border border-slate-400 text-sm">
                            <thead>
                                <tr className="bg-red-800 text-white">
                                    <th className="border border-red-900 p-2 w-12 text-center">Sr.</th>
                                    <th className="border border-red-900 p-2 text-left">NC Statement</th>
                                    <th className="border border-red-900 p-2 text-left w-1/4">Requirement</th>
                                    <th className="border border-red-900 p-2 w-24 text-center">Clause</th>
                                    <th className="border border-red-900 p-2 w-32 text-center">Target Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.entries.filter(e => e.status === 'NC').map((entry, idx) => (
                                    <tr key={entry.id}>
                                        <td className="border border-slate-400 p-2 text-center align-top">{idx + 1}</td>
                                        <td className="border border-slate-400 p-2 align-top">{entry.ncStatement || '-'}</td>
                                        <td className="border border-slate-400 p-2 align-top">{entry.requirement || '-'}</td>
                                        <td className="border border-slate-400 p-2 text-center align-top">{entry.clause}</td>
                                        <td className="border border-slate-400 p-2 text-center align-top">
                                            {entry.targetDate ? new Date(entry.targetDate).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Summary */}
                <div className="mb-8 p-4 border border-slate-400 bg-slate-50 rounded-lg">
                    <div className="flex justify-around text-center">
                         <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase">Total NCs</div>
                            <div className="text-2xl font-bold text-red-600">{data.entries.filter(e => e.status === 'NC').length}</div>
                         </div>
                         <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase">Areas for Improvement</div>
                            <div className="text-2xl font-bold text-amber-600">{data.entries.filter(e => e.status === 'AFI').length}</div>
                         </div>
                         <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase">Compliant Points</div>
                             <div className="text-2xl font-bold text-green-600">{data.entries.filter(e => e.status === 'OK').length}</div>
                         </div>
                    </div>
                </div>

                {/* Footer Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-12 page-break-inside-avoid">
                     <div>
                        <div className="border-b border-slate-800 mb-2"></div>
                        <div className="font-bold text-sm">Auditor Signature</div>
                        <div className="text-xs text-slate-500">Date: _________________</div>
                     </div>
                     <div>
                        <div className="border-b border-slate-800 mb-2"></div>
                        <div className="font-bold text-sm">Auditee Acceptance</div>
                        <div className="text-xs text-slate-500">Date: _________________</div>
                     </div>
                </div>

            </div>
        </div>
      </div>
    </div>
    </>
  );
}
