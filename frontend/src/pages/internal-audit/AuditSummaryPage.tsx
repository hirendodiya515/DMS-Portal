
import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertOctagon, AlertTriangle, FileText, Download } from 'lucide-react';
import api from '../../lib/api';
import AuditReportViewer from '../../components/internal-audit/AuditReportViewer';

interface SummaryStats {
  totalSchedules: number;
  completedSchedules: number;
  totalNC: number;
  totalAFI: number;
  complianceScore: number;
}

interface AuditReport {
  id: string;
  date: string;
  department: string;
  scope: string;
  auditors: any[];
  ncCount: number;
  afiCount: number;
}

export default function AuditSummaryPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [stats, setStats] = useState<SummaryStats>({
    totalSchedules: 0,
    completedSchedules: 0,
    totalNC: 0,
    totalAFI: 0,
    complianceScore: 100,
  });
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit-executions/summary?startDate=${startDate}&endDate=${endDate}`);
      setStats(res.data.stats);
      setReports(res.data.reports);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (reportId: string) => {
    try {
      const response = await api.get(`/audit-executions/${reportId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-report-${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download audit report. Please try again.');
    }
  };

  const handleCloseReport = () => {
    setSelectedReportId(null);
  };

  return (
    <div className="audit-summary-page space-y-6 pb-20 print:hidden">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Internal Audit Summary</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of audit performance and compliance</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-sm border-none focus:ring-0 text-slate-600 outline-none"
          />
          <span className="text-slate-300">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Schedule Progress */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <CheckCircle className="w-16 h-16 text-blue-600" />
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Audit Progress</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-800">{stats.completedSchedules}</h3>
            <span className="text-slate-400 text-sm">/ {stats.totalSchedules} Scheduled</span>
          </div>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
             <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${stats.totalSchedules ? (stats.completedSchedules / stats.totalSchedules) * 100 : 0}%` }}
             />
          </div>
        </div>

        {/* Total NCs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <AlertOctagon className="w-16 h-16 text-red-600" />
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Non-Conformities</p>
          <div className="mt-2">
            <h3 className="text-3xl font-bold text-red-600">{stats.totalNC}</h3>
          </div>
          <p className="mt-1 text-xs text-red-600/80 font-medium">Critical findings</p>
        </div>

        {/* Total AFIs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <AlertTriangle className="w-16 h-16 text-amber-500" />
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Area for Improvement</p>
          <div className="mt-2">
            <h3 className="text-3xl font-bold text-amber-600">{stats.totalAFI}</h3>
          </div>
          <p className="mt-1 text-xs text-amber-600/80 font-medium">Opportunities detected</p>
        </div>

        {/* Compliance Score */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <FileText className="w-16 h-16 text-green-600" />
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Compliance Score</p>
          <div className="mt-2 flex items-baseline gap-1">
            <h3 className="text-3xl font-bold text-green-600">{stats.complianceScore}%</h3>
          </div>
          <p className="mt-1 text-xs text-green-600/80 font-medium">Overall adherence</p>
        </div>
      </div>

      {/* Completed Audits Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center print:hidden">
            <h3 className="font-semibold text-slate-800">Completed Audit Reports</h3>
        </div>
        
        {/* Printable Header */}
        <div className="hidden print:block p-6 text-center border-b border-slate-200 mb-4">
             <h1 className="text-2xl font-bold">Internal Audit Summary Report</h1>
             <p className="text-slate-500">Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium print:bg-white print:border-slate-300">
            <tr>
              <th className="px-6 py-3">Audit Date</th>
              <th className="px-6 py-3">Department</th>
              <th className="px-6 py-3">Scope</th>
              <th className="px-6 py-3 text-center">NCs</th>
              <th className="px-6 py-3 text-center">AFIs</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-slate-200">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 font-medium text-slate-700">
                    {new Date(report.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-3 text-slate-600">{report.department}</td>
                <td className="px-6 py-3 text-slate-600 max-w-xs truncate" title={report.scope}>{report.scope}</td>
                <td className="px-6 py-3 text-center">
                    {report.ncCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            {report.ncCount}
                        </span>
                    ) : (
                        <span className="text-slate-400">-</span>
                    )}
                </td>
                <td className="px-6 py-3 text-center">
                    {report.afiCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            {report.afiCount}
                        </span>
                    ) : (
                         <span className="text-slate-400">-</span>
                    )}
                </td>
                <td className="px-6 py-3 text-right print:hidden">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            onClick={() => setSelectedReportId(report.id)}
                        >
                            View
                        </button>
                        <button 
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                            onClick={() => handleDownloadPDF(report.id)}
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download
                        </button>
                    </div>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No completed audits found in this period.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedReportId && (
        <AuditReportViewer 
            reportId={selectedReportId} 
            onClose={handleCloseReport}
        />
      )}
    </div>
  );
}
