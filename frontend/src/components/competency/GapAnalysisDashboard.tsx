import { useState, useEffect } from 'react';
import { CompetencyAPI } from '../../lib/competency-api';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    ComposedChart, Line
} from 'recharts';
import { ChevronLeft, User as UserIcon, Building2, Target, AlertTriangle, BarChart as BarChartIcon } from 'lucide-react';

interface DeptSummary {
    department: string;
    required: number;
    actual: number;
}

interface UserSummary {
    id: string;
    name: string;
    role: string;
    required: number;
    actual: number;
    jobRoleId?: string;
}

interface CompGap {
    name: string;
    gap: number;
    percentage: number;
}

interface DetailedGap {
    competency: { name: string };
    requiredLevel: number;
    currentLevel: number;
    gap: number;
}

export default function GapAnalysisDashboard() {
    const [viewLevel, setViewLevel] = useState(1); // 1: Dept, 2: Person, 3: Detailed
    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

    const [deptData, setDeptData] = useState<DeptSummary[]>([]);
    const [userData, setUserData] = useState<UserSummary[]>([]);
    const [detailedData, setDetailedData] = useState<DetailedGap[]>([]);
    const [paretoData, setParetoData] = useState<CompGap[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [deptRes, paretoRes] = await Promise.all([
                CompetencyAPI.getDepartmentSummary(),
                CompetencyAPI.getCompetencyGapSummary()
            ]);
            setDeptData(deptRes.data);
            setParetoData(paretoRes.data);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeptClick = async (deptName: string) => {
        setSelectedDept(deptName);
        setLoading(true);
        try {
            const res = await CompetencyAPI.getDepartmentUserSummary(deptName);
            setUserData(res.data);
            setViewLevel(2);
        } catch (error) {
            console.error('Error loading user summary:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserClick = async (user: UserSummary) => {
        if (!user.jobRoleId) return;
        setSelectedUser(user);
        setLoading(true);
        try {
            const res = await CompetencyAPI.getGapAnalysis(user.id, user.jobRoleId);
            setDetailedData(res.data);
            setViewLevel(3);
        } catch (error) {
            console.error('Error loading gap analysis:', error);
        } finally {
            setLoading(false);
        }
    };


    const renderLevel1 = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Building2 className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">Department Overview</h2>
            </div>
            <div className="flex overflow-x-auto gap-6 pb-4 custom-scrollbar">
                {deptData.map((dept) => {
                    const data = [
                        { name: 'Actual', value: dept.actual },
                        { name: 'Remaining Gap', value: Math.max(0, dept.required - dept.actual) }
                    ];
                    return (
                        <div 
                            key={dept.department}
                            onClick={() => handleDeptClick(dept.department)}
                            className="flex-shrink-0 w-64 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                            <h3 className="text-center font-semibold text-gray-700 mb-2 group-hover:text-blue-600 truncate">{dept.department}</h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#3b82f6" />
                                            <Cell fill="#e2e8f0" />
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center mt-2">
                                <div className="text-2xl font-bold text-blue-600">
                                    {dept.required > 0 ? Math.round((dept.actual / dept.required) * 100) : 0}%
                                </div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider">Proficiency Score</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderLevel2 = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setViewLevel(1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{selectedDept}</h2>
                        <p className="text-sm text-gray-500 font-medium">Employee-wise Gap Analysis</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={userData}
                            onClick={(data: any) => data && data.activePayload && handleUserClick(data.activePayload[0].payload)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip cursor={{fill: '#f8fafc'}} />
                            <Legend />
                            <Bar dataKey="required" name="Required Score" fill="#94a3b8" />
                            <Bar dataKey="actual" name="Actual Score" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-sm text-gray-500 border-b border-gray-100">
                                <th className="pb-3 font-semibold">Employee</th>
                                <th className="pb-3 font-semibold">Job Role</th>
                                <th className="pb-3 font-semibold">Required</th>
                                <th className="pb-3 font-semibold">Actual</th>
                                <th className="pb-3 font-semibold">Gap %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {userData.map(user => (
                                <tr 
                                    key={user.id} 
                                    onClick={() => handleUserClick(user)}
                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                >
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                <UserIcon size={14} className="text-blue-600" />
                                            </div>
                                            <span className="font-medium text-gray-700">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-gray-600">{user.role}</td>
                                    <td className="py-4 text-gray-600 font-mono">{user.required}</td>
                                    <td className="py-4 text-gray-600 font-mono">{user.actual}</td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                                                <div 
                                                    className="h-full bg-blue-500 rounded-full" 
                                                    style={{ width: `${user.required > 0 ? Math.min(100, (user.actual / user.required) * 100) : 0}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500">
                                                {user.required > 0 ? Math.round((user.actual / user.required) * 100) : 0}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderLevel3 = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setViewLevel(2)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{selectedUser?.name}</h2>
                        <p className="text-sm text-gray-500 font-medium">{selectedUser?.role}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
                    <h3 className="font-semibold text-gray-700 mb-6 flex items-center gap-2">
                        <Target size={18} className="text-blue-600" />
                        Competency Profile (Radar)
                    </h3>
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={detailedData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="competency.name" tick={{fill: '#64748b', fontSize: 12}} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} />
                                <Radar
                                    name="Required"
                                    dataKey="requiredLevel"
                                    stroke="#94a3b8"
                                    fill="#94a3b8"
                                    fillOpacity={0.3}
                                />
                                <Radar
                                    name="Actual"
                                    dataKey="currentLevel"
                                    stroke="#3b82f6"
                                    fill="#3b82f6"
                                    fillOpacity={0.5}
                                />
                                <Tooltip />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" />
                        Gap Details
                    </h3>
                    <div className="space-y-4">
                        {detailedData.map(item => (
                            <div key={item.competency.name} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-700">{item.competency.name}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.gap <= 0 ? 'bg-green-100 text-green-700' : item.gap === 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.gap <= 0 ? 'No Gap' : `Gap: ${item.gap}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${item.gap <= 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${(item.currentLevel / item.requiredLevel) * 100}%` }}
                                        />
                                    </div>
                                    <div className="text-gray-500 font-medium">
                                        {item.currentLevel} / {item.requiredLevel}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPareto = () => (
        <div className="mt-12 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <BarChartIcon className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">Competency Gap Priority (Pareto Analysis)</h2>
            </div>
            <p className="text-sm text-gray-500 mb-8 max-w-2xl">
                This chart shows which competencies represent the largest total skill gaps across the entire organization. 
                Focus training efforts on the leftmost competencies to achieve maximum impact (80/20 rule).
            </p>
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={paretoData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            interval={0}
                            height={100}
                            tick={{fontSize: 12}}
                        />
                        <YAxis yAxisId="left" label={{ value: 'Total Gap Score', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="gap" name="Gap Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="percentage" name="Cumulative %" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gap Analysis Dashboard</h1>
                <p className="text-slate-600 mt-2">Identify and bridge skill gaps across departments and employees.</p>
            </div>

            {loading && viewLevel !== 1 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed text-gray-400">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="font-medium">Analyzing data...</p>
                </div>
            ) : (
                <>
                    {viewLevel === 1 && renderLevel1()}
                    {viewLevel === 2 && renderLevel2()}
                    {viewLevel === 3 && renderLevel3()}
                    
                    {renderPareto()}
                </>
            )}
        </div>
    );
}
