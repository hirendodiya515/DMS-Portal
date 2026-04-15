import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { 
  TrendingUp, Users, AlertTriangle, Star, 
  Search, Filter, Download, RefreshCw, X 
} from 'lucide-react';
import { generateFeedbackPdf } from '../../utils/generateFeedbackPdf';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// List of feedback questions and their keys
// ✅ Keys use camelCase to match TypeORM entity property names returned by the backend API
const QUESTION_FIELDS = [
  { key: 'thicknessDimensionQualityRating', label: 'Thickness & Dimension Quality', displayLabel: 'Thickness & Dimension' },
  { key: 'surfaceVisualQualityRating', label: 'Surface & Visual Quality', displayLabel: 'Surface & Visual' },
  { key: 'breakagesRating', label: 'Glass Breakages', displayLabel: 'Glass Breakages' },
  { key: 'edgeGrindingQualityRating', label: 'Edge Grinding Quality', displayLabel: 'Edge Grinding' },
  { key: 'arCoatingQualityRating', label: 'Coating Quality', displayLabel: 'AR Coating Quality' },
  { key: 'packingLoadingQualityRating', label: 'Packing and Loading Quality', displayLabel: 'Packing & Loading' },
  { key: 'pricingRating', label: 'Pricing Compared to Competitors', displayLabel: 'Competitive Pricing' },
  { key: 'deliveryLeadTimeRating', label: 'Delivery Lead Time', displayLabel: 'Delivery Lead Time' },
  { key: 'afterSalesServiceResponseRating', label: 'After Sales Service & Response Time', displayLabel: 'After-Sales Service' },
  { key: 'salesTeamApproachRating', label: 'Sales Team Approach and Response', displayLabel: 'Sales Team Approach' },
];

// Custom left-aligned Y-axis tick for the Question Wise chart
const CustomYAxisTick = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
    <text
      x={-165}
      y={0}
      textAnchor="start"
      fill="#475569"
      fontSize={11}
      dominantBaseline="middle"
    >
      {payload.value}
    </text>
  </g>
);

export default function CustomerSatisfactionDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [carList, setCarList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuestion, setModalQuestion] = useState<string | null>(null);
  const [modalScores, setModalScores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    console.log('Feedback List Count:', feedbackList.length);
    if (feedbackList.length > 0) {
      console.log('First feedback item:', feedbackList[0]);
    }
  }, [feedbackList]);

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

  const handleExportAll = () => {
    if (feedbackList.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Define CSV headers
    const headers = [
      "Date", "Company Name", "Contact Person", "Email", "Product", "BRL Representative",
      "CSI Score (%)", "Recommendation", "Overall Satisfaction", "Suggestion"
    ].join(",");

    // Prepare rows
    const rows = feedbackList.map(item => {
      // Calculate CSI
      const ratings = [
        item.thicknessDimensionQualityRating, item.surfaceVisualQualityRating,
        item.breakagesRating, item.edgeGrindingQualityRating,
        item.arCoatingQualityRating, item.packingLoadingQualityRating,
        item.pricingRating, item.deliveryLeadTimeRating,
        item.afterSalesServiceResponseRating, item.salesTeamApproachRating
      ].map(v => typeof v === 'number' ? v : 0);
      const sum = ratings.reduce((a, b) => a + b, 0);
      const csi = Math.round((sum / (ratings.length * 5)) * 100);

      const values = [
        new Date(item.createdAt || item.created_at).toLocaleDateString(),
        `"${(item.companyName || item.company_name || '').replace(/"/g, '""')}"`,
        `"${(item.contactPerson || item.contact_person || '').replace(/"/g, '""')}"`,
        item.email,
        `"${(item.product || '').replace(/"/g, '""')}"`,
        `"${(item.brlRepresentativeName || item.brl_representative_name || '').replace(/"/g, '""')}"`,
        `${csi}%`,
        `"${(item.recommendation || '').replace(/"/g, '""')}"`,
        `"${(item.overallSatisfaction || item.overall_satisfaction || '').replace(/"/g, '""')}"`,
        `"${(item.suggestion || '').replace(/"/g, '""').substring(0, 100)}"`
      ];
      return values.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Borosil_Customer_Feedback_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

  // Prepare question-wise average data for chart
  const questionData = QUESTION_FIELDS.map(q => {
    const scores = feedbackList
      .map(fb => {
        const val = (fb as any)[q.key];
        return typeof val === 'number' ? val : 0;
      })
      .filter(v => v > 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { name: q.displayLabel, fullName: q.label, key: q.key, score: Number(avg.toFixed(2)) };
  });

  // Debug: Log data to check if feedbackList is populated
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
          <button 
            onClick={handleExportAll}
            className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm"
          >
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

        {/* Question-wise Ratings Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Question Wise Rating</h3>
          <div style={{ height: 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={questionData} layout="vertical" margin={{ left: 5, right: 40, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={170} axisLine={false} tickLine={false} tick={<CustomYAxisTick />} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F1F5F9' }}
                  formatter={(value) => [value, 'Avg Score']}
                />
                <Bar dataKey="score" name="Average Rating" fill="#8B5CF6" radius={[0, 4, 4, 0]} isAnimationActive={true}
                  onClick={(data: any) => {
                    const selectedFullName = data.payload?.fullName || '';
                    const selectedKey = data.payload?.key || '';
                    setModalQuestion(selectedFullName || undefined);
                    // Gather all customer scores for this question
                    const scores = feedbackList
                      .filter(fb => typeof (fb as any)[selectedKey] === 'number' && (fb as any)[selectedKey] > 0)
                      .map(fb => ({
                        customer: (fb as any).company_name || (fb as any).companyName,
                        contact: (fb as any).contact_person || (fb as any).contactPerson,
                        score: (fb as any)[selectedKey],
                        date: (fb as any).created_at || (fb as any).createdAt
                      }));
                    setModalScores(scores);
                    setModalOpen(true);
                  }}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Native Modal for customer-wise scores - LINE CHART VERSION */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full h-[500px] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{modalQuestion} - Customer Comparison</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6">
              {modalScores.length === 0 ? (
                <div className="text-slate-500 text-center py-8">No scores available for this category.</div>
              ) : (
                <div className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={modalScores} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="customer" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11 }}
                        angle={-40}
                        textAnchor="end"
                        interval={0}
                        dy={10}
                      />
                      <YAxis 
                        domain={[0, 5]} 
                        ticks={[0, 1, 2, 3, 4, 5]}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11 }} 
                        width={30}
                      />
                      <RechartsTooltip 
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs">
                                <p className="font-bold text-blue-900 mb-1 border-b border-slate-100 pb-1">{d.customer}</p>
                                <div className="space-y-1 mt-1">
                                  <p className="text-slate-500">Contact: <span className="text-slate-900 font-medium">{d.contact}</span></p>
                                  <p className="text-slate-500">Score: <span className="text-blue-600 font-bold">{d.score} / 5</span></p>
                                  <p className="text-slate-500">Date: <span className="text-slate-900">{new Date(d.date).toLocaleDateString()}</span></p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#8B5CF6" 
                        strokeWidth={3} 
                        dot={{ r: 6, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 8, strokeWidth: 0 }} 
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t border-slate-200">
              <button 
                onClick={() => setModalOpen(false)} 
                className="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              ) : feedbackList.filter(item => {
                const s = searchTerm.toLowerCase();
                const company = (item.company_name || item.companyName || '').toLowerCase();
                const contact = (item.contact_person || item.contactPerson || '').toLowerCase();
                const brlRep = (item.brl_representative_name || item.brlRepresentativeName || '').toLowerCase();
                return company.includes(s) || contact.includes(s) || brlRep.includes(s);
              }).length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No matching results for "{searchTerm}"</td></tr>
              ) : (
                feedbackList
                  .filter(item => {
                    const s = searchTerm.toLowerCase();
                    const company = (item.company_name || item.companyName || '').toLowerCase();
                    const contact = (item.contact_person || item.contactPerson || '').toLowerCase();
                    const brlRep = (item.brl_representative_name || item.brlRepresentativeName || '').toLowerCase();
                    return company.includes(s) || contact.includes(s) || brlRep.includes(s);
                  })
                  .map(item => {
                  // CSI calculation using camelCase keys (TypeORM entity property names)
                  const ratings = [
                    item.thicknessDimensionQualityRating,
                    item.surfaceVisualQualityRating,
                    item.breakagesRating,
                    item.edgeGrindingQualityRating,
                    item.arCoatingQualityRating,
                    item.packingLoadingQualityRating,
                    item.pricingRating,
                    item.afterSalesServiceResponseRating,
                    item.salesTeamApproachRating,
                    item.deliveryLeadTimeRating
                  ];
                  const maxScore = ratings.length * 5;
                  const sum = ratings.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
                  const itemCSI = Math.round((sum / maxScore) * 100);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">{new Date(item.created_at || item.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{item.company_name || item.companyName}</div>
                        <div className="text-xs text-slate-500">{item.contact_person || item.contactPerson}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-700">{item.product || '-'}</div>
                        {(item.brlRepresentativeName || item.brl_representative_name) && (
                          <div className="text-[10px] text-blue-600 font-medium">BRL Rep: {item.brlRepresentativeName || item.brl_representative_name}</div>
                        )}
                      </td>
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
