import React, { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

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
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500 mt-1">Overview of your document management system</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card) => (
                    <div
                        key={card.title}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                                <p className="text-3xl font-bold text-slate-800 mt-2">{card.value}</p>
                            </div>
                            <div className={`${card.bgColor} p-3 rounded-lg`}>
                                <card.icon className={`w-6 h-6 ${card.textColor}`} />
                            </div>
                        </div>
                        <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${card.color}`}></div>
                    </div>
                ))}
            </div>

            {/* Trends Charts */}
            <div className="grid grid-cols-1 gap-6">
                {/* SOP Compliance Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">SOP/WI Compliance</h3>
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
                                        tick={{ fontSize: 11 }} 
                                        angle={-45}
                                        textAnchor="end"
                                        height={70}
                                        interval={0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                    <Tooltip 
                                        cursor={{ fill: '#F1F5F9' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="reqSop" name="Required" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="actSop" name="Actual" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">Format Compliance</h3>
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
                                        tick={{ fontSize: 11 }} 
                                        angle={-45}
                                        textAnchor="end"
                                        height={70}
                                        interval={0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                    <Tooltip 
                                        cursor={{ fill: '#F1F5F9' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="reqFormat" name="Required" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="actFormat" name="Actual" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
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

            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg p-8 text-white">
                <h3 className="text-2xl font-bold mb-2">ISO Compliance Ready</h3>
                <p className="text-blue-100">
                    Your document management system is configured for ISO compliance with full audit trails,
                    version control, and approval workflows.
                </p>
            </div>
        </div>
    );
}
