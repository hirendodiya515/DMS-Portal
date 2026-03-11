import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { pfmeaApi } from '../../../lib/pfmeaApi';

export default function SummaryTab({ pfmeaId }: { pfmeaId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pfmeaId === 'ALL') {
      pfmeaApi.getAll().then(allProcesses => {
        Promise.all(allProcesses.map((p: any) => pfmeaApi.getOne(p.id))).then(responses => {
          const allRows = responses.flatMap(res => res ? res.worksheetRows : []).filter(Boolean);
          setRows(allRows);
          setLoading(false);
        });
      });
    } else if (pfmeaId) {
      pfmeaApi.getOne(pfmeaId).then(res => {
        if (res && res.worksheetRows) {
          setRows(res.worksheetRows);
        }
        setLoading(false);
      });
    }
  }, [pfmeaId]);

  if (loading) return <div className="p-4 text-slate-500 font-bold">Synchronizing Dashboard...</div>;

  // Derive charts from live data
  const totalRows = rows.length;
  const criticalCount = rows.filter(r => r.riskLevel === 'Critical').length;
  const highCount = rows.filter(r => r.riskLevel === 'High').length;
  const mediumCount = rows.filter(r => r.riskLevel === 'Medium').length;
  const lowCount = rows.filter(r => r.riskLevel === 'Low').length;

  const RISK_DISTRIBUTION = [
    { name: 'Critical Risk', value: criticalCount, color: '#b91c1c' },
    { name: 'High Risk', value: highCount, color: '#ef4444' },
    { name: 'Medium Risk', value: mediumCount, color: '#f97316' },
    { name: 'Low Risk', value: lowCount, color: '#10b981' },
  ].filter(d => d.value > 0);

  const getRpnDist = () => {
    const dist = { '0-15': 0, '16-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    rows.forEach(r => {
      const rpn = r.rpn || 0;
      if (rpn <= 15) dist['0-15']++;
      else if (rpn <= 30) dist['16-30']++;
      else if (rpn <= 60) dist['31-60']++;
      else if (rpn <= 90) dist['61-90']++;
      else dist['90+']++;
    });
    return Object.entries(dist).map(([range, count]) => ({ range, count }));
  };
  const RPN_DISTRIBUTION = getRpnDist();

  // Pick top 10 highest RPN
  const TOP_RISKS = [...rows]
    .sort((a, b) => (b.rpn || 0) - (a.rpn || 0))
    .slice(0, 10);

  const completedActions = rows.filter(r => r.status === 'Completed').length;
  const progressPercent = totalRows > 0 ? Math.round((completedActions / totalRows) * 100) : 0;



  return (
    <div className="space-y-6">
      {/* Progress & Coverage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" /> Process Step Coverage
            </h3>
            <span className="text-2xl font-black text-blue-600">100%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full" style={{ width: '100%' }}></div>
          </div>
          <p className="text-sm text-slate-500 mt-2">{totalRows} of {totalRows} process steps analyzed</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Completion Progress
            </h3>
            <span className="text-2xl font-black text-indigo-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className="bg-indigo-600 h-3 rounded-full" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="text-sm text-slate-500 mt-2">Actions completed vs planned</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl col-span-1">
          <h3 className="font-bold text-slate-800 mb-6">Risk Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={RISK_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {RISK_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RPN Distribution */}
        <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl col-span-2">
          <h3 className="font-bold text-slate-800 mb-6">RPN Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={RPN_DISTRIBUTION}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Risks Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-slate-800">Top 10 Highest RPN Risks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Process Step</th>
                <th className="px-6 py-4 font-semibold">Failure Mode</th>
                <th className="px-6 py-4 font-semibold">Severity</th>
                <th className="px-6 py-4 font-semibold">RPN</th>
                <th className="px-6 py-4 font-semibold">Action Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TOP_RISKS.map((risk, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-700">{risk.processStep}</td>
                  <td className="px-6 py-4 text-slate-600">{risk.failureMode}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs ring-4 ring-white">
                      {risk.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-red-600">{risk.rpn}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      risk.status === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                      risk.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {risk.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
