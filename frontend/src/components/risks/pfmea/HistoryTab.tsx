import { useState, useEffect } from 'react';
import { History, Activity, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { pfmeaApi } from '../../../lib/pfmeaApi';



export default function HistoryTab({ pfmeaId }: { pfmeaId: string }) {
  const [activeSection, setActiveSection] = useState<'revisions' | 'actions' | 'changes' | 'audit'>('revisions');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pfmeaId === 'ALL') {
      pfmeaApi.getAll().then((allProcesses: any[]) => {
        Promise.all(allProcesses.map(p => pfmeaApi.getOne(p.id))).then(responses => {
          const allLogs = responses.flatMap(res => res ? res.auditLogs || [] : []);
          const sorted = allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(sorted);
          setLoading(false);
        });
      });
    } else if (pfmeaId) {
      pfmeaApi.getOne(pfmeaId).then(res => {
        if (res && res.auditLogs) {
          // Sort latest first
          const sorted = [...res.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(sorted);
        }
        setLoading(false);
      });
    }
  }, [pfmeaId]);

  if (loading) return <div className="p-4 text-slate-500 font-bold">Loading Audit Trails...</div>;

  // Derive dynamic tables
  const audittrail = auditLogs.map(log => {
    const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : (log.userId || 'System Action');
    return {
      user: userName,
      time: new Date(log.timestamp).toLocaleString(),
      actionType: log.action,
      details: log.details
    };
  });

  const REVISION_HISTORY = [
    { rev: '01', date: '2026-01-15', author: 'System Initialization', desc: 'Initial creation of Final Assembly Line PFMEA', added: 0, modified: 0 },
  ];

  const ACTION_LOG = audittrail.filter(log => log.details.includes('row') || log.actionType === 'update').map(log => ({
    type: log.details.toLowerCase().includes('delete') ? 'deleted' : 'updated',
    text: log.details,
    user: log.user,
    date: log.time
  }));

  const CHANGE_LOG = [
    { item: 'Risk Level Classifications', change: 'Auto-tracking via Audit Engine', date: 'Live', rpnChange: 'Automated Log' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
      {/* Mini-tabs for history sections */}
      <div className="flex bg-white border-b border-slate-200">
        {[
          { id: 'revisions', label: 'Revision History', icon: FileText },
          { id: 'actions', label: 'Action Log', icon: CheckCircle2 },
          { id: 'changes', label: 'Risk Change Log', icon: Activity },
          { id: 'audit', label: 'Audit Trail', icon: History },
        ].map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id as any)}
            className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors border-b-2 ${
              activeSection === sec.id
                ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <sec.icon className="w-4 h-4" />
            {sec.label}
          </button>
        ))}
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        
        {/* Revision History */}
        {activeSection === 'revisions' && (
          <div className="space-y-4 animate-in fade-in">
            {REVISION_HISTORY.map((rev, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="bg-blue-100 text-blue-700 font-black text-xl w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                  {rev.rev}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-lg">{rev.desc}</h4>
                    <span className="text-sm font-semibold text-slate-500">{rev.date}</span>
                  </div>
                  <div className="flex items-center gap-6 mt-3">
                    <div className="text-sm">
                      <span className="text-slate-500 font-medium">Author: </span>
                      <span className="font-bold text-slate-700">{rev.author}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full">+{rev.added} Risks Added</span>
                      <span className="px-3 py-1 bg-orange-50 text-orange-700 font-bold text-xs rounded-full">{rev.modified} Risks Modified</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Log */}
        {activeSection === 'actions' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-in fade-in">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-600">Date & Time</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Action Activity</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ACTION_LOG.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">{log.date}</td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      {log.type === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                       log.type === 'updated' ? <Activity className="w-4 h-4 text-blue-500" /> :
                       <FileText className="w-4 h-4 text-slate-400" />}
                      <span className="text-slate-800">{log.text}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{log.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Risk Change Log */}
        {activeSection === 'changes' && (
          <div className="space-y-4 animate-in fade-in">
            {CHANGE_LOG.map((log, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{log.item}</h4>
                    <p className="text-slate-600 text-sm mt-1">{log.change}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">RPN Impact</span>
                  <span className="font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{log.rpnChange}</span>
                  <p className="text-xs text-slate-400 mt-2">{log.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audit Trail */}
        {activeSection === 'audit' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-in fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-600">Timestamp</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">User</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Action Type</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audittrail.map((trail, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-500 font-medium">{trail.time}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{trail.user}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wider">
                          {trail.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-800 bg-slate-50/50">{trail.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
