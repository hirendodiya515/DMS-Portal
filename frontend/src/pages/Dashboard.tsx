import { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import IsoCertificatesSection from '../components/IsoCertificatesSection';

interface Stats {
    total: number;
    byStatus: {
        draft: number;
        underReview: number;
        approved: number;
        rejected: number;
    };
}

interface TrendData {
    name: string;
    reqSop: number;
    actSop: number;
    reqFormat: number;
    actFormat: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [statsRes, deptRes, actualRes] = await Promise.all([
                api.get('/documents/stats'),
                api.get('/settings/department_requirements').catch(() => ({ data: { value: {} } })),
                api.get('/documents/department-stats')
            ]);

            setStats(statsRes.data);

            // Merge Data
            const required = deptRes.data || {}; // Backend returns raw value
            const actual = actualRes.data || {};
            
            // Get all unique departments from both sources
            const allDepts = Array.from(new Set([...Object.keys(required), ...Object.keys(actual)]));

            const mergedData = allDepts.map(dept => ({
                name: dept,
                reqSop: parseInt(required[dept]?.sops || 0),
                actSop: actual[dept]?.sops || 0,
                reqFormat: parseInt(required[dept]?.formats || 0),
                actFormat: actual[dept]?.formats || 0,
            }));

            setTrendData(mergedData);

        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Documents',
            value: stats?.total || 0,
            icon: FileText,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: 'Under Review',
            value: stats?.byStatus.underReview || 0,
            icon: Clock,
            color: 'from-yellow-500 to-yellow-600',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-600',
        },
        {
            title: 'Approved',
            value: stats?.byStatus.approved || 0,
            icon: CheckCircle,
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: 'Draft',
            value: stats?.byStatus.draft || 0,
            icon: TrendingUp,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Dashboard heading + ISO certificate cards inline */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500 mt-1">Overview of your document management system</p>
                </div>
                <IsoCertificatesSection />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card) => (
                    <div
                        key={card.title}
                        className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider">{card.title}</p>
                                <p className="text-3xl font-black text-slate-800 mt-2">{card.value}</p>
                            </div>
                            <div className={`${card.bgColor} p-3 rounded-xl transition-all duration-300 group-hover:scale-110`}>
                                <card.icon className={`w-5 h-5 ${card.textColor}`} />
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                    </div>
                ))}
            </div>

            {/* Trends Charts */}
            <div className="grid grid-cols-1 gap-6">
                {/* SOP Compliance Chart */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">SOP/WI Compliance</h3>
                    <div className="h-[300px] w-full">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={trendData}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                                        angle={-45}
                                        textAnchor="end"
                                        height={70}
                                        interval={0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
                                    <Tooltip 
                                        cursor={{ fill: '#F8FAFC' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="reqSop" name="Required" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="actSop" name="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Format Compliance Chart */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Format Compliance</h3>
                    <div className="h-[300px] w-full">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={trendData}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                                        angle={-45}
                                        textAnchor="end"
                                        height={70}
                                        interval={0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
                                    <Tooltip 
                                        cursor={{ fill: '#F8FAFC' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="reqFormat" name="Required" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="actFormat" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                No data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl shadow-premium p-8 text-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent)] pointer-events-none"></div>
                <h3 className="text-2xl font-black mb-2 relative z-10">ISO Compliance Ready</h3>
                <p className="text-blue-100 max-w-2xl relative z-10 leading-relaxed text-sm">
                    Your document management system is fully configured to satisfy standard ISO requirements. 
                    Keep records updated to maintain active compliance status across all departments.
                </p>
            </div>
        </div>
    );
}
