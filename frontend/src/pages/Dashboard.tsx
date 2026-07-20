import { useEffect, useState } from 'react';
import { 
    FileText, 
    Clock, 
    CheckCircle, 
    Calendar, 
    ClipboardCheck, 
    ArrowRight, 
    ShieldAlert, 
    Activity, 
    Wrench, 
    Sparkles,
    Plus,
    XCircle,
    CheckSquare
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
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

interface ActionItem {
    id: string;
    type: string;
    title: string;
    description: string;
    link: string;
    severity: 'high' | 'medium' | 'low';
}

interface AuditLog {
    id: string;
    action: string;
    userId: string;
    details: string;
    timestamp: string;
    user?: {
        firstName: string;
        lastName: string;
    };
}

interface NC {
    id: string;
    title: string;
    clause: string;
    targetDate: string;
    date: string;
    department: string;
    ncStatus: 'Open' | 'Awaiting Review' | 'Closed';
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
                </div>
                <div className="flex gap-3">
                    <div className="h-12 w-28 bg-slate-200 rounded-xl"></div>
                    <div className="h-12 w-28 bg-slate-200 rounded-xl"></div>
                    <div className="h-12 w-28 bg-slate-200 rounded-xl"></div>
                    <div className="h-12 w-28 bg-slate-200 rounded-xl"></div>
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="flex border-b border-slate-200 pb-px gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 w-32 bg-slate-200 rounded-t-xl"></div>
                ))}
            </div>

            {/* Stats Row Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft h-28 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-grow">
                                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                                <div className="h-8 w-12 bg-slate-300 rounded"></div>
                            </div>
                            <div className="h-11 w-11 bg-slate-200 rounded-xl"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Split Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Actions & Activity (Span 2) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden h-[300px] flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="h-5 w-40 bg-slate-200 rounded"></div>
                            <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
                        </div>
                        <div className="divide-y divide-slate-100 p-6 space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="h-4 w-4/5 bg-slate-200 rounded"></div>
                                    <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 h-[250px]">
                        <div className="h-5 w-36 bg-slate-200 rounded mb-4"></div>
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0"></div>
                                    <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Portfolio (Span 1) */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 h-[300px] flex flex-col justify-between">
                        <div className="my-4 flex items-center justify-center">
                            <div className="h-32 w-32 rounded-full border-8 border-slate-100"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="h-8 bg-slate-100 rounded"></div>
                            <div className="h-8 bg-slate-100 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'overview' | 'dms' | 'calibration' | 'deviations' | 'trainings'>('overview');

    // Data States
    const [stats, setStats] = useState<Stats | null>(null);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    
    const [calibrationStats, setCalibrationStats] = useState<{
        totalEquipment: number;
        calibrationOk: number;
        calibrationDue: number;
        calibrationUpcoming: number;
        departmentSummary: Array<{ department: string; count: number }>;
        upcomingCalibrations: Array<{
            week: number;
            count: number;
            equipment: Array<{ id: string; name: string; department: string; nextCalibrationDate: Date }>;
        }>;
        allCalibrations: Array<{
            id: string;
            name: string;
            department: string;
            nextCalibrationDate: Date;
            status: string;
        }>;
    } | null>(null);

    const [productDeviationSummary, setProductDeviationSummary] = useState<{
        totalDeviations: number;
        openDeviations: number;
        closedDeviations: number;
    } | null>(null);

    const [processDeviationSummary, setProcessDeviationSummary] = useState<{
        totalDeviations: number;
        openDeviations: number;
        closedDeviations: number;
    } | null>(null);

    const [mocsSummary, setMocsSummary] = useState<{
        total: number;
        draft: number;
        pending: number;
        closed: number;
    }>({ total: 0, draft: 0, pending: 0, closed: 0 });

    const [upcomingTrainings, setUpcomingTrainings] = useState<any[]>([]);
    const [pendingActions, setPendingActions] = useState<ActionItem[]>([]);
    
    // Phase 2 States
    const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
    const [ncList, setNcList] = useState<NC[]>([]);
    const [ncStats, setNcStats] = useState<{ total: number; open: number; awaiting: number; closed: number }>({ total: 0, open: 0, awaiting: 0, closed: 0 });
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, [user]);

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // Fetch settings/configs for matching roles in Action Items
            const [
                statsRes, 
                deptRes, 
                actualRes, 
                calibRes, 
                prodDevSummaryRes,
                processDevSummaryRes,
                documentsRes,
                prodDevsRes,
                processDevsRes,
                mocsRes,
                trainingsRes,
                pdCeoRes,
                pdPlantHeadRes,
                pdQualityHeadRes,
                pdMarketingRes,
                prQaHeadRes,
                prPlantHeadRes,
                prProcessHeadRes,
                prCeoRes,
                auditLogsRes,
                ncRes
            ] = await Promise.all([
                api.get('/documents/stats').catch(() => ({ data: null })),
                api.get('/settings/department_requirements').catch(() => ({ data: {} })),
                api.get('/documents/department-stats').catch(() => ({ data: {} })),
                api.get('/equipment/dashboard').catch(() => ({ data: null })),
                api.get('/product-deviation/summary').catch(() => ({ data: null })),
                api.get('/process-deviation/summary').catch(() => ({ data: null })),
                // Detail API calls for populating action items
                api.get('/documents').catch(() => ({ data: [] })),
                api.get('/product-deviation').catch(() => ({ data: [] })),
                api.get('/process-deviation').catch(() => ({ data: [] })),
                api.get('/moc').catch(() => ({ data: [] })),
                api.get('/training-calendar').catch(() => ({ data: [] })),
                // Role configs
                api.get('/settings/product_deviation_ceo').catch(() => ({ data: null })),
                api.get('/settings/product_deviation_plant_head').catch(() => ({ data: null })),
                api.get('/settings/product_deviation_quality_head').catch(() => ({ data: null })),
                api.get('/settings/product_deviation_marketing_person').catch(() => ({ data: null })),
                api.get('/settings/process_deviation_qa_head').catch(() => ({ data: null })),
                api.get('/settings/process_deviation_plant_head').catch(() => ({ data: null })),
                api.get('/settings/process_deviation_process_head').catch(() => ({ data: null })),
                api.get('/settings/process_deviation_ceo').catch(() => ({ data: null })),
                // Phase 2 endpoints
                api.get('/audit-logs').catch(() => ({ data: [] })),
                api.get('/audit-executions/nc-list').catch(() => ({ data: [] }))
            ]);

            // Set simple states
            if (statsRes?.data) setStats(statsRes.data);
            if (calibRes?.data) setCalibrationStats(calibRes.data);
            if (prodDevSummaryRes?.data) setProductDeviationSummary(prodDevSummaryRes.data);
            if (processDevSummaryRes?.data) setProcessDeviationSummary(processDevSummaryRes.data);

            // Phase 2 Activity Feed
            const logsList = auditLogsRes?.data || [];
            setRecentActivity(logsList.slice(0, 8)); // Display last 8 logs

            // Phase 2 NC tracking
            const rawNcs = ncRes?.data || [];
            setNcList(rawNcs);
            const openNC = rawNcs.filter((n: any) => n.ncStatus === 'Open').length;
            const awaitingNC = rawNcs.filter((n: any) => n.ncStatus === 'Awaiting Review').length;
            const closedNC = rawNcs.filter((n: any) => n.ncStatus === 'Closed').length;
            setNcStats({
                total: rawNcs.length,
                open: openNC,
                awaiting: awaitingNC,
                closed: closedNC
            });

            // Merge SOP / Format Trend Data
            const required = deptRes?.data || {};
            const actual = actualRes?.data || {};
            const allDepts = Array.from(new Set([...Object.keys(required), ...Object.keys(actual)]));
            const mergedData = allDepts.map(dept => ({
                name: dept,
                reqSop: parseInt(required[dept]?.sops || 0),
                actSop: actual[dept]?.sops || 0,
                reqFormat: parseInt(required[dept]?.formats || 0),
                actFormat: actual[dept]?.formats || 0,
            }));
            setTrendData(mergedData);

            // MOC calculations
            const mocList = mocsRes?.data || [];
            let mocDraft = 0, mocPending = 0, mocClosed = 0;
            mocList.forEach((m: any) => {
                if (m.status === 'Draft') mocDraft++;
                else if (m.status === 'Closed') mocClosed++;
                else mocPending++;
            });
            setMocsSummary({
                total: mocList.length,
                draft: mocDraft,
                pending: mocPending,
                closed: mocClosed
            });

            // Set Trainings
            const trainingList = trainingsRes?.data || [];
            const upcoming = trainingList
                .filter((t: any) => t.isActive && new Date(t.trainingDate) >= new Date())
                .sort((a: any, b: any) => new Date(a.trainingDate).getTime() - new Date(b.trainingDate).getTime());
            setUpcomingTrainings(upcoming.slice(0, 5));

            // Compile Action Items
            const userId = user?.id;
            const userRole = user?.role;
            const userDept = user?.department;
            const actions: ActionItem[] = [];

            // 1. Documents pending review/approval
            if (userRole === 'admin' || userRole === 'reviewer' || userRole === 'compliance_manager') {
                const docsList = documentsRes?.data || [];
                const underReviewDocs = docsList.filter((d: any) => d.status === 'UNDER_REVIEW');
                underReviewDocs.forEach((d: any) => {
                    actions.push({
                        id: `doc-${d.id}`,
                        type: 'DMS',
                        title: `Review Document: ${d.title}`,
                        description: `Doc No: ${d.documentNumber || 'Draft'} (${d.type} - ${d.departments?.join(', ') || 'N/A'})`,
                        link: `/documents/${d.id}`,
                        severity: 'medium',
                    });
                });
            }

            // 2. Product Deviations pending signature or approval
            const pdList = prodDevsRes?.data || [];
            pdList.forEach((pd: any) => {
                if (pd.status === 'OPEN') {
                    const isResp = pd.responsiblePersons?.some((rp: any) => rp.userId === userId && !rp.signedAt);
                    if (isResp) {
                        actions.push({
                            id: `pd-plan-${pd.id}`,
                            type: 'Product Deviation',
                            title: `Sign Action Plan: ${pd.serialNumber}`,
                            description: `Pending your signature as a responsible person. Nature: ${pd.natureOfDeviation || 'N/A'}`,
                            link: `/product-deviation/${pd.id}`,
                            severity: 'high',
                        });
                    }
                } else if (pd.status === 'PENDING_MARKETING' && (pdMarketingRes?.data === userId || userRole === 'admin')) {
                    actions.push({
                        id: `pd-mkt-${pd.id}`,
                        type: 'Product Deviation',
                        title: `Marketing Remarks Required: ${pd.serialNumber}`,
                        description: `Deviation waiting for marketing analysis.`,
                        link: `/product-deviation/${pd.id}`,
                        severity: 'medium',
                    });
                } else if (pd.status === 'PENDING_PLANT_HEAD') {
                    const isPlant = pdPlantHeadRes?.data === userId || userRole === 'admin';
                    const isCeo = pdCeoRes?.data === userId || userRole === 'admin';
                    if (isPlant || isCeo) {
                        actions.push({
                            id: `pd-ph-${pd.id}`,
                            type: 'Product Deviation',
                            title: `Plant Head / CEO Approval Required: ${pd.serialNumber}`,
                            description: `Pending final operational approval.`,
                            link: `/product-deviation/${pd.id}`,
                            severity: 'high',
                        });
                    }
                } else if (pd.status === 'PENDING_QUALITY_HEAD' && (pdQualityHeadRes?.data === userId || userRole === 'admin')) {
                    actions.push({
                        id: `pd-qh-${pd.id}`,
                        type: 'Product Deviation',
                        title: `Quality Head Approval Required: ${pd.serialNumber}`,
                        description: `Final quality sign-off required.`,
                        link: `/product-deviation/${pd.id}`,
                        severity: 'high',
                    });
                }
            });

            // 3. Process Deviations pending signature or approval
            const prList = processDevsRes?.data || [];
            prList.forEach((pr: any) => {
                if (pr.status === 'OPEN') {
                    const isResp = pr.responsiblePersons?.some((rp: any) => rp.userId === userId && !rp.signedAt);
                    if (isResp) {
                        actions.push({
                            id: `pr-plan-${pr.id}`,
                            type: 'Process Deviation',
                            title: `Sign Action Plan: ${pr.serialNumber}`,
                            description: `Sign-off on containment actions. Parameter: ${pr.parameterUnderDeviation || 'N/A'}`,
                            link: `/process-deviation/${pr.id}`,
                            severity: 'high',
                        });
                    }
                } else if (pr.status === 'PENDING_FUNCTIONAL_HEAD' && ((userRole === 'dept_head' && userDept === pr.department) || userRole === 'admin')) {
                    actions.push({
                        id: `pr-fh-${pr.id}`,
                        type: 'Process Deviation',
                        title: `Functional Head Approval: ${pr.serialNumber}`,
                        description: `Review action plan for Department: ${pr.department}.`,
                        link: `/process-deviation/${pr.id}`,
                        severity: 'high',
                    });
                } else if (pr.status === 'PENDING_QA_HEAD' && (prQaHeadRes?.data === userId || userRole === 'admin')) {
                    actions.push({
                        id: `pr-qa-${pr.id}`,
                        type: 'Process Deviation',
                        title: `QA Head Approval Required: ${pr.serialNumber}`,
                        description: `Review process parameter deviation.`,
                        link: `/process-deviation/${pr.id}`,
                        severity: 'high',
                    });
                } else if (pr.status === 'PENDING_PLANT_HEAD' && (prPlantHeadRes?.data === userId || userRole === 'admin')) {
                    actions.push({
                        id: `pr-ph-${pr.id}`,
                        type: 'Process Deviation',
                        title: `Plant Head Approval Required: ${pr.serialNumber}`,
                        description: `Review process deviation.`,
                        link: `/process-deviation/${pr.id}`,
                        severity: 'high',
                    });
                } else if (pr.status === 'PENDING_PROCESS_HEAD' && (prProcessHeadRes?.data === userId || userRole === 'admin')) {
                    actions.push({
                        id: `pr-prh-${pr.id}`,
                        type: 'Process Deviation',
                        title: `Process Head Approval Required: ${pr.serialNumber}`,
                        description: `Review parameters.`,
                        link: `/process-deviation/${pr.id}`,
                        severity: 'high',
                    });
                } else if (pr.status === 'PENDING_CEO' && (prCeoRes?.data === userId || userRole === 'admin')) {
                    actions.push({
                        id: `pr-ceo-${pr.id}`,
                        type: 'Process Deviation',
                        title: `CEO Approval Required: ${pr.serialNumber}`,
                        description: `Final CEO authorization needed.`,
                        link: `/process-deviation/${pr.id}`,
                        severity: 'high',
                    });
                }
            });

            // 4. MOC approvals
            mocList.forEach((m: any) => {
                if (m.status === 'Pending HOD' && ((userRole === 'dept_head' && userDept === m.department) || userRole === 'admin')) {
                    actions.push({
                        id: `moc-hod-${m.id}`,
                        type: 'MOC',
                        title: `HOD Approval Needed: ${m.mocNo}`,
                        description: `Review MOC request. Topic: ${m.description?.substring(0, 50)}...`,
                        link: '/moc',
                        severity: 'high',
                    });
                } else if (m.status === 'Pending QA/EHS' && (userRole === 'compliance_manager' || userRole === 'admin')) {
                    actions.push({
                        id: `moc-qaehs-${m.id}`,
                        type: 'MOC',
                        title: `QA/EHS Review Needed: ${m.mocNo}`,
                        description: `Topic: ${m.description?.substring(0, 50)}...`,
                        link: '/moc',
                        severity: 'high',
                    });
                }
            });

            // 5. Calibration due instruments (for admins or department users)
            if (calibRes?.data?.allCalibrations) {
                const dueEquip = calibRes.data.allCalibrations.filter((eq: any) => eq.status === 'DUE');
                dueEquip.forEach((eq: any) => {
                    if (userRole === 'admin' || eq.department === userDept) {
                        actions.push({
                            id: `cal-due-${eq.id}`,
                            type: 'Calibration',
                            title: `Calibration Overdue: ${eq.name}`,
                            description: `Due Date: ${new Date(eq.nextCalibrationDate).toLocaleDateString()} (Dept: ${eq.department})`,
                            link: '/calibration-equipment',
                            severity: 'medium',
                        });
                    }
                });
            }

            setPendingActions(actions);

        } catch (error) {
            console.error('Failed to fetch dashboard statistics:', error);
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
            color: 'from-amber-500 to-amber-600',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-600',
        },
        {
            title: 'Approved',
            value: stats?.byStatus.approved || 0,
            icon: CheckCircle,
            color: 'from-emerald-500 to-emerald-600',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600',
        },
        {
            title: 'Action Required',
            value: pendingActions.length,
            icon: ShieldAlert,
            color: 'from-rose-500 to-rose-600',
            bgColor: 'bg-rose-50',
            textColor: 'text-rose-600',
        },
    ];

    if (loading) {
        return <DashboardSkeleton />;
    }

    // Pie chart distribution data
    const docPieData = stats ? [
        { name: 'Approved', value: stats.byStatus.approved, color: '#10b981' },
        { name: 'Under Review', value: stats.byStatus.underReview, color: '#f59e0b' },
        { name: 'Draft', value: stats.byStatus.draft, color: '#8b5cf6' },
        { name: 'Rejected', value: stats.byStatus.rejected, color: '#ef4444' },
    ].filter(item => item.value > 0) : [];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header section with User Profile Context */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-black text-slate-800">DMS Command Center</h1>
                        <div className="bg-indigo-50 px-2.5 py-1 rounded-full text-indigo-700 text-xs font-bold flex items-center gap-1.5 border border-indigo-100">
                            <Sparkles className="w-3.5 h-3.5" />
                            QMS Hub
                        </div>
                    </div>
                    <p className="text-slate-500 mt-1.5 text-sm font-medium">
                        Welcome back, <span className="text-slate-800 font-bold">{user?.firstName} {user?.lastName}</span> ({user?.role?.toUpperCase()} | {user?.department || 'General'})
                    </p>
                </div>
                <IsoCertificatesSection />
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
                {[
                    { id: 'overview', label: 'Dashboard Overview', icon: Activity },
                    { id: 'dms', label: 'DMS Compliance', icon: FileText },
                    { id: 'calibration', label: 'Calibration Monitor', icon: Wrench },
                    { id: 'deviations', label: 'Quality & Deviations', icon: ClipboardCheck },
                    { id: 'trainings', label: 'Trainings', icon: Calendar },
                ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border-t border-x transition-all duration-200 whitespace-nowrap cursor-pointer
                                ${isActive 
                                    ? 'bg-white border-slate-200 text-indigo-700 -mb-px shadow-sm font-bold' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <TabIcon className={`w-4 h-4 ${isActive ? 'text-indigo-650' : 'text-slate-400'}`} />
                            {tab.label}
                            {tab.id === 'overview' && pendingActions.length > 0 && (
                                <span className="bg-rose-500 text-white rounded-full text-[10px] px-1.5 py-0.5 ml-1 font-bold animate-pulse">
                                    {pendingActions.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* TAB CONTENTS */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards.map((card) => (
                            <div
                                key={card.title}
                                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group"
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
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

                    {/* Dashboard 3-Column Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT COLUMN: Pending Actions & Activity Feed (Span 2) */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Pending Actions List */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden flex flex-col">
                                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                            <ShieldAlert className="w-5 h-5 text-rose-500" />
                                            My Pending Actions
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Tasks requiring your authorization or review</p>
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${pendingActions.length > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {pendingActions.length} Pending
                                    </span>
                                </div>
                                
                                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[250px]">
                                    {pendingActions.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <div className="bg-emerald-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <p className="text-slate-800 font-bold text-sm">All caught up!</p>
                                            <p className="text-slate-400 text-xs mt-0.5">No pending documents or approvals at this moment.</p>
                                        </div>
                                    ) : (
                                        pendingActions.map((action) => (
                                            <div 
                                                key={action.id} 
                                                className="px-6 py-3.5 hover:bg-slate-50 transition-colors flex flex-wrap items-center justify-between gap-4"
                                            >
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0
                                                        ${action.severity === 'high' ? 'bg-rose-500 animate-pulse' : action.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} 
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border
                                                                ${action.type === 'DMS' ? 'bg-blue-50 border-blue-100 text-blue-700' : 
                                                                  action.type === 'Calibration' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
                                                                  action.type === 'MOC' ? 'bg-purple-50 border-purple-100 text-purple-700' : 
                                                                  'bg-rose-50 border-rose-100 text-rose-700'}`}
                                                            >
                                                                {action.type}
                                                            </span>
                                                            <h4 className="font-bold text-slate-800 text-sm truncate">{action.title}</h4>
                                                        </div>
                                                        <p className="text-slate-500 text-xs mt-0.5 truncate">{action.description}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => navigate(action.link)}
                                                    className="flex items-center gap-1 text-xs text-indigo-650 hover:text-indigo-800 font-bold bg-indigo-50/50 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100/50 transition-colors cursor-pointer"
                                                >
                                                    Resolve
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Recent Activity Feed Widget */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden p-6">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-850 text-base flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-indigo-650" />
                                            Recent Activity Feed
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Real-time audit log activities from the workspace</p>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/audit-logs')}
                                        className="text-xs font-bold text-indigo-650 hover:underline hover:text-indigo-800"
                                    >
                                        View Full Logs
                                    </button>
                                </div>

                                <div className="relative border-l-2 border-slate-100 ml-3.5 pl-5 space-y-5">
                                    {recentActivity.length === 0 ? (
                                        <p className="text-slate-400 text-xs italic py-4">No recent activity logs available.</p>
                                    ) : (
                                        recentActivity.map((log) => {
                                            const isApprove = log.action?.toLowerCase().includes('approve') || log.action?.toLowerCase().includes('sign');
                                            const isCreate = log.action?.toLowerCase().includes('create') || log.action?.toLowerCase().includes('submit');
                                            const isReject = log.action?.toLowerCase().includes('reject');

                                            return (
                                                <div key={log.id} className="relative text-xs">
                                                    {/* Timeline node icon */}
                                                    <span className={`absolute -left-[30px] top-0.5 p-1 rounded-full border bg-white flex items-center justify-center
                                                        ${isApprove ? 'border-emerald-200 text-emerald-600' : 
                                                          isCreate ? 'border-blue-200 text-blue-600' : 
                                                          isReject ? 'border-rose-200 text-rose-600' : 
                                                          'border-slate-200 text-slate-500'}`}
                                                    >
                                                        {isApprove ? <CheckCircle className="w-3 h-3" /> : 
                                                         isCreate ? <Plus className="w-3 h-3" /> : 
                                                         isReject ? <XCircle className="w-3 h-3" /> : 
                                                         <Activity className="w-3 h-3" />}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-slate-800">
                                                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}{' '}
                                                            <span className="font-medium text-slate-500">{log.details}</span>
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 block">
                                                            {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Document Portfolio Pie Chart (Span 1) */}
                        <div className="space-y-6">
                            
                            {/* Document Distribution Pie */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-850 text-base">Document Portfolio</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Distribution of documents by status</p>
                                </div>
                                
                                <div className="h-[150px] w-full relative flex items-center justify-center my-2">
                                    {docPieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={docPieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={68}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {docPieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${value} Documents`, 'Count']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-slate-400 text-xs">No documents in database</div>
                                    )}
                                    <div className="absolute flex flex-col items-center justify-center">
                                        <span className="text-xl font-black text-slate-800">{stats?.total || 0}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                    {docPieData.map((item) => (
                                        <div key={item.name} className="flex items-center gap-1.5 border border-slate-100 rounded-lg p-1.5 bg-slate-50/30">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                            <div className="min-w-0">
                                                <p className="text-slate-550 truncate font-semibold">{item.name}</p>
                                                <p className="font-bold text-slate-800">{item.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom compliance message */}
                    <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-2xl shadow-premium p-8 text-white relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent)] pointer-events-none"></div>
                        <h3 className="text-2xl font-black mb-2 relative z-10">ISO Audit Readiness</h3>
                        <p className="text-indigo-100 max-w-2xl relative z-10 leading-relaxed text-sm font-medium">
                            Your dashboard displays real-time compliance matrices for ISO 9001, 14001, and 45001. 
                            Ensure that equipment calibrations are up to date and open deviations are cleared to guarantee active audit readiness.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'dms' && (
                <div className="grid grid-cols-1 gap-6">
                    {/* SOP Compliance Chart */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-800">SOP/WI Compliance</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Required vs Actual Standard Operating Procedures department-wise</p>
                        </div>
                        <div className="h-[320px] w-full">
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
                                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                                            angle={-45}
                                            textAnchor="end"
                                            height={70}
                                            interval={0}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 650 }} />
                                        <Tooltip 
                                            cursor={{ fill: '#F8FAFC' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="reqSop" name="Required" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={18} />
                                        <Bar dataKey="actSop" name="Actual" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={18} />
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
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Format Compliance</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Required vs Actual Formats and Checklists department-wise</p>
                        </div>
                        <div className="h-[320px] w-full">
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
                                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                                            angle={-45}
                                            textAnchor="end"
                                            height={70}
                                            interval={0}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 650 }} />
                                        <Tooltip 
                                            cursor={{ fill: '#F8FAFC' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="reqFormat" name="Required" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={18} />
                                        <Bar dataKey="actFormat" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
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
            )}

            {activeTab === 'calibration' && (
                <div className="space-y-6">
                    {/* Calibration Stat Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-soft">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Total Instruments</span>
                            <p className="text-3xl font-black text-slate-800 mt-1">{calibrationStats?.totalEquipment || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-soft border-l-4 border-l-emerald-500">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Calibration OK</span>
                            <p className="text-3xl font-black text-emerald-600 mt-1">{calibrationStats?.calibrationOk || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-soft border-l-4 border-l-amber-500">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Upcoming (Within Month)</span>
                            <p className="text-3xl font-black text-amber-600 mt-1">{calibrationStats?.calibrationUpcoming || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-soft border-l-4 border-l-rose-500">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Overdue / Calibration Due</span>
                            <p className="text-3xl font-black text-rose-600 mt-1">{calibrationStats?.calibrationDue || 0}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Weekly upcoming calendar */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 lg:col-span-2">
                            <h3 className="font-bold text-slate-855 text-base mb-4">Upcoming Calibrations Schedule</h3>
                            <div className="space-y-4">
                                {calibrationStats?.upcomingCalibrations.map(week => (
                                    <div key={week.week} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm text-slate-700">Week {week.week}</span>
                                            <span className="bg-indigo-50 text-indigo-755 text-xs px-2 py-0.5 rounded-full font-bold border border-indigo-100">
                                                {week.count} Instruments
                                            </span>
                                        </div>
                                        {week.equipment.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No instruments scheduled for calibration this week</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                                {week.equipment.map((eq: any) => (
                                                    <div key={eq.id} className="bg-white p-2 rounded-lg border border-slate-200/50 flex justify-between items-center text-xs">
                                                        <div className="min-w-0 pr-2">
                                                            <p className="font-bold text-slate-800 truncate">{eq.name}</p>
                                                            <p className="text-slate-400 text-[10px] truncate">{eq.department}</p>
                                                        </div>
                                                        <span className="text-indigo-650 font-bold whitespace-nowrap bg-indigo-50/50 px-1.5 py-0.5 rounded">
                                                            {new Date(eq.nextCalibrationDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* All Equipment Health Map */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 flex flex-col">
                            <h3 className="font-bold text-slate-800 text-base mb-2">Instruments by Department</h3>
                            <p className="text-xs text-slate-500 mb-4">Total registered calibration items</p>
                            <div className="flex-grow space-y-3 overflow-y-auto max-h-[350px] pr-1">
                                {calibrationStats?.departmentSummary.length === 0 ? (
                                    <div className="text-slate-400 text-xs text-center py-10">No instruments added.</div>
                                ) : (
                                    calibrationStats?.departmentSummary.map(item => (
                                        <div key={item.department} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50/30">
                                            <span className="text-xs font-semibold text-slate-700">{item.department}</span>
                                            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-bold">
                                                {item.count} items
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button
                                onClick={() => navigate('/calibration-equipment')}
                                className="w-full mt-4 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none"
                            >
                                Manage Equipment
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'deviations' && (
                <div className="space-y-6">
                    {/* Deviation Summaries Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Product Deviations */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-slate-850 text-base">Product Deviations</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Deviation reports on manufactured items</p>
                                <div className="mt-4 flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-800">{productDeviationSummary?.totalDeviations || 0}</span>
                                    <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 pt-4 text-xs">
                                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 text-center">
                                    <p className="text-rose-500 font-bold text-[10px] uppercase">Open / Pending</p>
                                    <p className="text-xl font-bold text-rose-700 mt-1">{productDeviationSummary?.openDeviations || 0}</p>
                                </div>
                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
                                    <p className="text-emerald-500 font-bold text-[10px] uppercase">Closed / Signed</p>
                                    <p className="text-xl font-bold text-emerald-700 mt-1">{productDeviationSummary?.closedDeviations || 0}</p>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => navigate('/product-deviation')}
                                className="w-full mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-100"
                            >
                                Product Deviations Page
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Process Deviations */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-slate-850 text-base">Process Parameter Deviations</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Deviation reports on process variables</p>
                                <div className="mt-4 flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-800">{processDeviationSummary?.totalDeviations || 0}</span>
                                    <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 pt-4 text-xs">
                                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 text-center">
                                    <p className="text-rose-500 font-bold text-[10px] uppercase">Open / Pending</p>
                                    <p className="text-xl font-bold text-rose-700 mt-1">{processDeviationSummary?.openDeviations || 0}</p>
                                </div>
                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
                                    <p className="text-emerald-500 font-bold text-[10px] uppercase">Closed / Approved</p>
                                    <p className="text-xl font-bold text-emerald-700 mt-1">{processDeviationSummary?.closedDeviations || 0}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/process-deviation')}
                                className="w-full mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-100"
                            >
                                Process Deviations Page
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Management of Change (MOC) */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-slate-855 text-base">Management of Change (MOC)</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Change control compliance files</p>
                                <div className="mt-4 flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-800">{mocsSummary.total}</span>
                                    <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-6 border-t border-slate-100 pt-4 text-xs">
                                <div className="bg-slate-50 border border-slate-150 rounded-xl py-2 px-1 text-center">
                                    <p className="text-slate-500 font-bold text-[9px] uppercase">Draft</p>
                                    <p className="text-sm font-bold text-slate-700 mt-1">{mocsSummary.draft}</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl py-2 px-1 text-center">
                                    <p className="text-amber-500 font-bold text-[9px] uppercase">Pending</p>
                                    <p className="text-sm font-bold text-amber-700 mt-1">{mocsSummary.pending}</p>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl py-2 px-1 text-center">
                                    <p className="text-emerald-500 font-bold text-[9px] uppercase">Closed</p>
                                    <p className="text-sm font-bold text-emerald-700 mt-1">{mocsSummary.closed}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/moc')}
                                className="w-full mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-100"
                            >
                                Change Control (MOC) Page
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Phase 2: Internal Audit & Non-Conformance Tracker section */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5 text-indigo-650" />
                                    Internal Audit NC (Non-Conformance) Tracker
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">Compliance findings and corrective action tracking (ISO Clause 9.2 & 10.2)</p>
                            </div>
                            <button
                                onClick={() => navigate('/internal-audit/nc-tracking')}
                                className="text-xs font-bold text-indigo-650 hover:underline hover:text-indigo-800"
                            >
                                NC Tracking Dashboard
                            </button>
                        </div>

                        {/* NC Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Total Findings</span>
                                <p className="text-2xl font-black text-slate-800 mt-0.5">{ncStats.total}</p>
                            </div>
                            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-center border-l-4 border-l-rose-500">
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Open NCs</span>
                                <p className="text-2xl font-black text-rose-700 mt-0.5">{ncStats.open}</p>
                            </div>
                            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-center border-l-4 border-l-amber-500">
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Awaiting Review</span>
                                <p className="text-2xl font-black text-amber-700 mt-0.5">{ncStats.awaiting}</p>
                            </div>
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center border-l-4 border-l-emerald-500">
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Closed NCs</span>
                                <p className="text-2xl font-black text-emerald-700 mt-0.5">{ncStats.closed}</p>
                            </div>
                        </div>

                        {/* NC List Table */}
                        <div className="overflow-x-auto">
                            {ncList.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs italic">No NC findings reported.</div>
                            ) : (
                                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-450 uppercase text-[9px] font-bold tracking-wider">
                                            <th className="py-2.5 px-3">Title</th>
                                            <th className="py-2.5 px-3">Department</th>
                                            <th className="py-2.5 px-3">Clause Reference</th>
                                            <th className="py-2.5 px-3">Audit Date</th>
                                            <th className="py-2.5 px-3">Target Closure</th>
                                            <th className="py-2.5 px-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                        {ncList.slice(0, 5).map((nc) => (
                                            <tr key={nc.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-3 font-bold text-slate-800">{nc.title}</td>
                                                <td className="py-3 px-3 uppercase text-[10px]">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">{nc.department}</span>
                                                </td>
                                                <td className="py-3 px-3 font-mono text-[10px] text-slate-500">Clause {nc.clause}</td>
                                                <td className="py-3 px-3">{new Date(nc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="py-3 px-3">{nc.targetDate ? new Date(nc.targetDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                                                <td className="py-3 px-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
                                                        ${nc.ncStatus === 'Open' ? 'bg-rose-50 border-rose-100 text-rose-600' : 
                                                          nc.ncStatus === 'Awaiting Review' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                                                          'bg-emerald-50 border-emerald-100 text-emerald-600'}`}
                                                    >
                                                        <span className={`w-1 h-1 rounded-full 
                                                            ${nc.ncStatus === 'Open' ? 'bg-rose-500 animate-pulse' : 
                                                              nc.ncStatus === 'Awaiting Review' ? 'bg-amber-500' : 
                                                              'bg-emerald-500'}`} 
                                                        />
                                                        {nc.ncStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'trainings' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-650" />
                                Upcoming Training Calendar
                            </h3>
                            <p className="text-xs text-slate-550 mt-0.5">Scheduled personnel training courses for QMS/ISO compliance</p>
                        </div>
                        <button
                            onClick={() => navigate('/competency/training')}
                            className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none"
                        >
                            Configure Trainings
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        {upcomingTrainings.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm">
                                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                No upcoming training programs scheduled.
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                        <th className="py-3 px-4">Topic / Course Name</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Time</th>
                                        <th className="py-3 px-4">Target Department</th>
                                        <th className="py-3 px-4">Location</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                    {upcomingTrainings.map((t: any) => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-850">{t.trainingName}</td>
                                            <td className="py-3.5 px-4">{new Date(t.trainingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="py-3.5 px-4">{t.startTime || 'N/A'} - {t.endTime || 'N/A'}</td>
                                            <td className="py-3.5 px-4">
                                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-slate-200/50">
                                                    {t.department || 'All Departments'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">{t.location || 'N/A'}</td>
                                            <td className="py-3.5 px-4">
                                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Active
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
