import { useState, useEffect } from 'react';
import { CompetencyAPI } from '../lib/competency-api';
import api from '../lib/api';
import { 
    Search, 
    Filter, 
    User, 
    ChevronRight, 
    Award, 
    Star, 
    Target, 
    TrendingUp,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
} from '@tanstack/react-table';

interface UserData {
    id: string; // OrgNode ID
    name: string;
    designation: string;
    department: string;
    photoUrl?: string;
    jobRole?: {
        title: string;
    };
    jobRoleId?: string;
}

interface AssessmentItem {
    competency: {
        id: string;
        name: string;
        category: string;
    };
    requiredLevel: number;
    currentLevel: number;
    gap: number;
    status: string;
}

export default function SkillAssessmentPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [assessmentData, setAssessmentData] = useState<AssessmentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, roleFilter]);

    useEffect(() => {
        if (selectedUser && selectedUser.jobRoleId) {
            loadAssessmentData(selectedUser.id, selectedUser.jobRoleId);
        } else {
            setAssessmentData([]);
        }
    }, [selectedUser]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            // Fetch from Org Chart (Master Employee List)
            const res = await api.get('/org-chart');
            console.log('Org Chart Data:', res.data);
            // Ensure we map relations correctly if backend returns nested jobRole
            setUsers(res.data.map((node: any) => ({
                id: node.id,
                name: node.name,
                designation: node.designation,
                department: node.department,
                photoUrl: node.photoUrl,
                jobRoleId: node.jobRoleId,
                jobRole: node.jobRole
            })));
        } catch (error) {
            console.error('Failed to users:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = users;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(u => 
                u.name.toLowerCase().includes(lower) || 
                u.designation?.toLowerCase().includes(lower) ||
                u.jobRole?.title.toLowerCase().includes(lower)
            );
        }
        setFilteredUsers(filtered);
    };

    const loadAssessmentData = async (employeeId: string, roleId: string) => {
        setLoadingData(true);
        try {
            const res = await CompetencyAPI.getGapAnalysis(employeeId, roleId);
            setAssessmentData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleRatingChange = async (competencyId: string, level: number) => {
        if (!selectedUser) return;
        
        // Optimistic update
        setAssessmentData(prev => prev.map(item => {
            if (item.competency.id === competencyId) {
                const newGap = item.requiredLevel - level;
                let status = 'Meets';
                if (newGap > 0) status = newGap === 1 ? 'Needs Improvement' : 'Critical';
                return { ...item, currentLevel: level, gap: newGap, status };
            }
            return item;
        }));

        try {
            await CompetencyAPI.rateSkill({
                employeeId: selectedUser.id,
                competencyId,
                currentLevel: level
            });
        } catch (error) {
            console.error('Failed to rate skill:', error);
        }
    };

    const columns: ColumnDef<AssessmentItem>[] = [
        { 
            accessorKey: 'competency.name', 
            header: 'Competency',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium text-slate-900">{row.original.competency.name}</div>
                    <div className="text-xs text-slate-500">{row.original.competency.category}</div>
                </div>
            )
        },
        { 
            accessorKey: 'requiredLevel', 
            header: 'Target Level',
            cell: ({ getValue }) => (
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <Target size={16} className="text-blue-500" />
                    Level {getValue() as number}
                </div>
            )
        },
        { 
            accessorKey: 'currentLevel', 
            header: 'Current Rating',
            cell: ({ row }) => (
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleRatingChange(row.original.competency.id, star)}
                            className={`p-1 rounded-full transition-all hover:scale-110 ${
                                star <= row.original.currentLevel 
                                    ? 'text-yellow-400' 
                                    : 'text-slate-200 hover:text-yellow-200'
                            }`}
                        >
                            <Star size={20} fill={star <= row.original.currentLevel ? "currentColor" : "none"} />
                        </button>
                    ))}
                </div>
            )
        },
        { 
            accessorKey: 'gap', 
            header: 'Gap Analysis',
            cell: ({ row }) => {
                const gap = row.original.gap;
                const isPositive = gap <= 0;
                return (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium w-fit ${
                        isPositive ? 'bg-green-100 text-green-700' : 
                        gap === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {isPositive ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {isPositive ? 'Meets Requirement' : `Gap: -${gap}`}
                    </div>
                );
            }
        },
    ];

    const table = useReactTable({
        data: assessmentData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
            {/* Sidebar List */}
            <div className="w-full md:w-80 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-slate-50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <User className="text-blue-600" size={20} />
                        Employees
                    </h2>
                    <div className="mt-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search name or role..." 
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading...</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div 
                                key={user.id} 
                                onClick={() => setSelectedUser(user)}
                                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${
                                    selectedUser?.id === user.id 
                                        ? 'border-l-blue-600 bg-blue-50/50' 
                                        : 'border-l-transparent'
                                }`}
                            >
                                <div className="font-medium text-slate-900">{user.name}</div>
                                <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
                                    <span>{user.designation}</span>
                                    {selectedUser?.id === user.id && <ChevronRight size={14} className="text-blue-600" />}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {selectedUser ? (
                    <>
                        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    {selectedUser.name}
                                    <span className="text-base font-normal px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                        {selectedUser.jobRole?.title || 'No Role Assigned'}
                                    </span>
                                </h1>
                                <p className="text-slate-500 mt-1 flex items-center gap-2">
                                    <Award size={16} />
                                    Department: {selectedUser.department}
                                </p>
                            </div>
                            {!selectedUser.jobRoleId && (
                                <div className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm border border-yellow-200 flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    Assign a Job Role to start assessment
                                </div>
                            )}
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            {loadingData ? (
                                <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    Loading Assessment Data...
                                </div>
                            ) : !selectedUser.jobRoleId ? (
                                <div className="text-center py-20 text-slate-400">
                                    <User size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Please assign a Job Role in User Management first.</p>
                                </div>
                            ) : assessmentData.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No competency requirements defined for this role.</p>
                                    <p className="text-sm mt-2">Go to Job Roles to add requirements.</p>
                                </div>
                            ) : (
                                <div>
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b text-slate-500 text-sm font-medium">
                                            {table.getHeaderGroups().map(headerGroup => (
                                                <tr key={headerGroup.id}>
                                                    {headerGroup.headers.map(header => (
                                                        <th key={header.id} className="px-6 py-4">
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                        </th>
                                                    ))}
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {table.getRowModel().rows.map(row => (
                                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                                    {row.getVisibleCells().map(cell => (
                                                        <td key={cell.id} className="px-6 py-4">
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <User size={40} className="opacity-50" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-600">Select an Employee</h3>
                        <p className="max-w-xs text-center mt-2">
                            Select an employee from the list to view and rate their competency levels.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
