import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { 
  TrendingUp, Users, AlertTriangle, Star, 
  Search, Filter, Download, RefreshCw 
} from 'lucide-react';
import { generateFeedbackPdf } from '../../utils/generateFeedbackPdf';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CustomerSatisfactionDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [carList, setCarList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = useAuthStore.getState().token;
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, feedbackRes, carsRes] = await Promise.all([
        fetch(`${API_URL}/customer-feedback/stats`, { headers }),
        fetch(`${API_URL}/customer-feedback`, { headers }),
        fetch(`${API_URL}/customer-feedback/cars`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (feedbackRes.ok) setFeedbackList(await feedbackRes.json());
      if (carsRes.ok) setCarList(await carsRes.json());

    } catch (error) {
      console.error('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);
      const token = useAuthStore.getState().token;
      const res = await fetch(`${API_URL}/customer-feedback/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSyncResult(`✅ Synced ${data.synced} feedback, ${data.cars} CARs`);
      // Refresh dashboard after sync
      await fetchDashboardData();
    } catch {
      setSyncResult('❌ Sync failed, check network');
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

  const categoryData = stats.categoryAverages ? Object.entries(stats.categoryAverages).map(([name, score]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    score
  })) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customer Satisfaction Dashboard</h1>
          <p className="text-slate-500">ISO 9001 Compliance & Feedback Tracking</p>
        </div>
        <div className="flex gap-3 items-center">
          {syncResult && (
            <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{syncResult}</span>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync from Neon'}
          </button>
          <button className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Customer Satisfaction Index</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.csi}%</h3>
            </div>
            <div className={`p-3 rounded-lg ${stats.csi >= 85 ? 'bg-green-100 text-green-600' : stats.csi >= 70 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={stats.csi >= 85 ? 'text-green-600 font-medium' : 'text-slate-600'}>
              {stats.csi >= 85 ? 'Excellent' : stats.csi >= 70 ? 'Good' : stats.csi >= 60 ? 'Acceptable' : 'Action Required'}
            </span>
            <span className="text-slate-400 ml-2">vs max 100%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Average Score</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.averageScore} <span className="text-lg text-slate-500 font-normal">/ 5</span></h3>
            </div>
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
              <Star className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500">Across all categories</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Responses</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.totalResponses}</h3>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500">Collected till date</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Low Rating Alerts (CARs)</p>
              <h3 className="text-3xl font-bold text-red-600 mt-2">{stats.totalCars}</h3>
            </div>
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-red-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis">Requires Corrective Action</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Satisfaction Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#E2E8F0', strokeWidth: 2 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" name="Average Score" dataKey="score" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Ratings Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Category Wise Rating</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Bar dataKey="score" name="Average Rating" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Corrective Action Requests (Active Alerts) */}
      {carList.filter(car => car.status === 'Open').length > 0 && (
        <div className="bg-white border-l-4 border-red-500 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 flex justify-between bg-red-50/30">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Active Corrective Action Requests (CAR)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="font-medium p-4">Customer</th>
                  <th className="font-medium p-4">Issue Description</th>
                  <th className="font-medium p-4">Score</th>
                  <th className="font-medium p-4">Action Owner</th>
                  <th className="font-medium p-4">Deadline</th>
                  <th className="font-medium p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carList.filter(car => car.status === 'Open').map((car) => (
                  <tr key={car.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{car.customerName}</td>
                    <td className="p-4">{car.issueDescription}</td>
                    <td className="p-4"><span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded">{car.score} / 5</span></td>
                    <td className="p-4">{car.actionOwner}</td>
                    <td className="p-4 text-red-600 font-medium">{new Date(car.deadline).toLocaleDateString()}</td>
                    <td className="p-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium uppercase">{car.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Feedback Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800">Recent Customer Feedback</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search customers..." 
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="font-medium p-4">Date</th>
                <th className="font-medium p-4">Customer</th>
                <th className="font-medium p-4">Product</th>
                <th className="font-medium p-4">CSI Score</th>
                <th className="font-medium p-4">Recommendation</th>
                <th className="font-medium p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feedbackList.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No feedback received yet</td></tr>
              ) : (
                feedbackList.map(item => {
                  const itemCSI = Math.round(
                    ((item.qualityRating + item.deliveryRating + item.packagingRating + 
                    item.supportRating + item.responseRating + item.complaintRating + 
                    item.documentationRating + item.overallRating) / 40) * 100
                  );
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{item.companyName}</div>
                        <div className="text-xs text-slate-500">{item.contactPerson}</div>
                      </td>
                      <td className="p-4">{item.product || '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          itemCSI >= 80 ? 'bg-green-100 text-green-700' : 
                          itemCSI >= 60 ? 'bg-amber-100 text-amber-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {itemCSI}%
                        </span>
                      </td>
                      <td className="p-4">{item.recommendation}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => generateFeedbackPdf(item)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
