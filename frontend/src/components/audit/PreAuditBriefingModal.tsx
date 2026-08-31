import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Clock, FileText, ShieldAlert, Printer, X, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface PreAuditBriefingResponse {
  department: string;
  scheduleId?: string;
  scope?: string;
  plannedDate?: string;
  riskScore: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  repeatNCs: {
    theme: string;
    count: number;
    lastClauses: string[];
    description: string;
  }[];
  overdueEquipment: {
    equipmentNumber: string;
    name: string;
    nextCalibrationDate: string;
    status: string;
  }[];
  recentDocRevisions: {
    documentNumber: string;
    title: string;
    type: string;
    updatedAt: string;
  }[];
  highRisks: {
    type: 'HIRA' | 'EAA';
    riskNumber: string;
    description: string;
    riskLevel: string;
  }[];
  recommendedChecklist: {
    id: number;
    isoStandard: 'ISO 9001:2015' | 'ISO 14001:2015' | 'ISO 45001:2018';
    clauseNumber: string;
    clauseTitle: string;
    auditQuestion: string;
    verificationTarget: string;
  }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scheduleId?: string;
  department?: string;
}

export const PreAuditBriefingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  scheduleId,
  department,
}) => {
  const [data, setData] = useState<PreAuditBriefingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<{ [id: number]: boolean }>({});

  useEffect(() => {
    if (isOpen) {
      fetchBriefing();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, scheduleId, department]);

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PreAuditBriefingResponse>('/ai/pre-audit-briefing', {
        params: { scheduleId, department },
      });
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch pre-audit briefing:', err);
      setError('Unable to generate pre-audit briefing. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCheck = (id: number) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none print:max-h-none print:static">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700 print:bg-transparent print:border-b-2 print:border-slate-300">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 print:hidden">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white print:text-slate-900 flex items-center gap-2">
                AI Pre-Audit Briefing & Repeat NC Predictor
              </h2>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Department: <span className="font-semibold text-amber-400 print:text-amber-700">{data?.department || department || 'General'}</span>
                {data?.plannedDate && <span className="ml-3">Planned Date: {data.plannedDate}</span>}
                {data?.scope && <span className="ml-3">Scope: {data.scope}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 print:hidden">
            <button
              onClick={handlePrint}
              disabled={loading || !data}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition"
              title="Print Briefing Card for Auditor"
            >
              <Printer className="w-4 h-4" />
              <span>Print Briefing</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-sm font-medium text-slate-300">
                Analyzing historical NCs, calibration status, SOP revisions & risks for {department || 'Department'}...
              </p>
            </div>
          ) : error ? (
            <div className="flex items-center space-x-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Risk Score & Executive Summary Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-xl bg-gradient-to-r from-slate-800/90 via-slate-800/70 to-slate-800/90 border border-slate-700/80 shadow-lg">
                <div className="flex flex-col items-center justify-center p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Audit Risk Score
                  </span>
                  <div className="relative flex items-center justify-center my-1">
                    <span className={`text-4xl font-extrabold ${
                      data.riskLevel === 'HIGH' ? 'text-rose-400' : data.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {data.riskScore}%
                    </span>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 mt-1 text-[11px] font-bold rounded-full border ${
                    data.riskLevel === 'HIGH'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : data.riskLevel === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {data.riskLevel} RISK AUDIT
                  </span>
                </div>

                <div className="md:col-span-3 flex flex-col justify-center space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Auditor Insight</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed print:text-slate-800">
                    {data.summary}
                  </p>
                </div>
              </div>

              {/* Grid Section: Repeat NCs & Overdue Calibration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Repeat NC Warnings */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Repeat NC Warnings ({data.repeatNCs.length})</span>
                    </h3>
                  </div>
                  {data.repeatNCs.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No repeat NC themes detected in previous audits.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {data.repeatNCs.map((nc, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/70 border border-amber-500/30 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between font-semibold text-slate-200">
                            <span className="text-amber-200">{nc.theme}</span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                              Logged {nc.count}x
                            </span>
                          </div>
                          {nc.lastClauses.length > 0 && (
                            <p className="text-[11px] text-slate-400">
                              Historical Clauses: <span className="text-slate-300 font-mono">{nc.lastClauses.join(', ')}</span>
                            </p>
                          )}
                          <p className="text-[11px] text-slate-300 italic">{nc.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Overdue Calibration Instruments */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-400" />
                      <span>Overdue Equipment / Calibration ({data.overdueEquipment.length})</span>
                    </h3>
                  </div>
                  {data.overdueEquipment.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">All active equipment in this department have valid calibration certificates.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {data.overdueEquipment.map((eq, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs">
                          <div>
                            <p className="font-semibold text-rose-200">{eq.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">No: {eq.equipmentNumber}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-rose-300 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40">
                              OVERDUE
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">Due: {eq.nextCalibrationDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Grid Section: Recent SOP Revisions & High Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 3. Recent Document Revisions */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span>Recent SOP/WI Revisions (Last 60 Days: {data.recentDocRevisions.length})</span>
                    </h3>
                  </div>
                  {data.recentDocRevisions.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No documents revised in the last 60 days.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {data.recentDocRevisions.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/70 border border-slate-700 rounded-lg text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">{doc.title}</p>
                            <p className="text-[11px] text-sky-300 font-mono">{doc.documentNumber} ({doc.type.toUpperCase()})</p>
                          </div>
                          <span className="text-[10px] text-slate-400">Revised: {doc.updatedAt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. High Safety/Environmental Risks */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-orange-400" />
                      <span>High HIRA/EAA Risk Factors ({data.highRisks.length})</span>
                    </h3>
                  </div>
                  {data.highRisks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No critical/high risk hazards logged for this department.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {data.highRisks.map((risk, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-orange-300 mr-2 font-mono">[{risk.type} {risk.riskNumber}]</span>
                            <span className="text-slate-200">{risk.description}</span>
                          </div>
                          <span className="text-[10px] font-bold text-orange-400 px-2 py-0.5 rounded bg-orange-500/20">
                            {risk.riskLevel}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* 5. Recommended Audit Verification Checklist */}
              <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 print:text-slate-900">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span>Tailored Auditor Verification Checklist</span>
                    </h3>
                    <p className="text-xs text-slate-400 print:text-slate-600">
                      Mapped strictly to <strong className="text-emerald-400">ISO 9001:2015</strong>, <strong className="text-sky-400">ISO 14001:2015</strong>, and <strong className="text-amber-400">ISO 45001:2018</strong> standards.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.recommendedChecklist.map((item) => {
                    const isChecked = checkedItems[item.id] || false;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCheck(item.id)}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200'
                            : 'bg-slate-900/80 border-slate-700 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by parent div
                            className="mt-1 w-4 h-4 text-emerald-500 rounded border-slate-600 focus:ring-emerald-400"
                          />
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-sm font-semibold text-white">
                                {item.id}. {item.clauseTitle}
                              </span>
                              <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                                item.isoStandard.includes('9001')
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : item.isoStandard.includes('14001')
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}>
                                {item.isoStandard} — Clause {item.clauseNumber}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-normal">
                              {item.auditQuestion}
                            </p>
                            <p className="text-[11px] text-amber-300/90 font-mono pt-1">
                              👉 On-Site Verification Target: {item.verificationTarget}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800/80 border-t border-slate-700 print:hidden">
          <span className="text-xs text-slate-400">
            Powered by DMS Compliance AI Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
export default PreAuditBriefingModal;
