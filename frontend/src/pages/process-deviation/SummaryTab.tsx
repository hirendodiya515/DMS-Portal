import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function SummaryTab() {
  const [data, setData] = useState({
    totalDeviations: 0,
    openDeviations: 0,
    closedDeviations: 0,
    monthWise: [],
    deviationMonthWise: []
  });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get('/process-deviation/summary');
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 shadow-sm">
          <h3 className="text-blue-600 text-sm font-semibold uppercase tracking-wider">Total Deviations</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">{data.totalDeviations}</p>
        </div>
        <div className="bg-amber-50/50 p-6 rounded-xl border border-amber-100 shadow-sm">
          <h3 className="text-amber-600 text-sm font-semibold uppercase tracking-wider">Open / Pending</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">{data.openDeviations}</p>
        </div>
        <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100 shadow-sm">
          <h3 className="text-emerald-600 text-sm font-semibold uppercase tracking-wider">Closed</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">{data.closedDeviations}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Month-Wise Deviations (By Creation Date)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthWise} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="count" fill="#2563eb" name="Deviations" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Month-Wise Deviations (By Production Date)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.deviationMonthWise} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="count" fill="#10b981" name="Deviations" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
