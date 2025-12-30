import { useState, useEffect } from 'react';
import { CompetencyAPI } from '../../lib/competency-api';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface User {
    id: string;
    name: string;
    designation?: string;
    department?: string;
    jobRoleId?: string;
}

interface Skill {
    id?: string;
    competencyId: string;
    competency: {
        id: string;
        name: string;
        category: string;
        maxLevel: number;
    };
    currentLevel: number;
}

interface Competency {
    id: string;
    name: string;
    category: string;
    maxLevel: number;
}

export default function EmployeeSkillMatrix() {
    const { user: currentUser } = useAuthStore();
    const canRate = currentUser?.role === 'admin' || currentUser?.role === 'reviewer';

    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [allCompetencies, setAllCompetencies] = useState<Competency[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        loadUsers();
        loadCompetencies();
        loadDepartments();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, departmentFilter]);

    useEffect(() => {
        if (selectedUser) {
            loadSkillsAndRequirements(selectedUser.id, selectedUser.jobRoleId);
        } else {
            setSkills([]);
        }
    }, [selectedUser]);

    const loadDepartments = async () => {
        try {
             // Re-using the same endpoints as utilized in MasterDataSettings
             const res = await api.get('/settings/departments');
             setDepartments(res.data || []);
        } catch (error) {
            console.error('Failed to load departments', error);
        }
    };

    const loadUsers = async () => { 
        try {
            const res = await api.get('/org-chart'); 
            // Map OrgNode to User interface expected by this component
            setUsers(res.data.map((node: any) => ({
                id: node.id,
                name: node.name,
                designation: node.designation,
                department: node.department,
                jobRoleId: node.jobRoleId
            })));
        } catch (error) { console.error(error); }
    };

    const filterUsers = () => {
        let result = users;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u => 
                u.name.toLowerCase().includes(term) || 
                u.designation?.toLowerCase().includes(term)
            );
        }

        if (departmentFilter !== 'All') {
            result = result.filter(u => u.department === departmentFilter);
        }

        setFilteredUsers(result);
    };

    const loadCompetencies = async () => {
        try {
            const res = await CompetencyAPI.getCompetencies();
            setAllCompetencies(res.data);
        } catch (error) { console.error(error); }
    };

    const loadSkillsAndRequirements = async (userId: string, roleId?: string) => {
        setLoading(true);
        try {
            const [skillsRes, requirementsRes] = await Promise.all([
                CompetencyAPI.getEmployeeSkills(userId),
                roleId ? CompetencyAPI.getRequirements(roleId) : Promise.resolve({ data: [] })
            ]);

            setSkills(skillsRes.data);

            if (roleId && requirementsRes.data.length > 0) {
                // If role exists, limit competencies to requirements
                const requiredComps = requirementsRes.data.map((req: any) => req.competency);
                setAllCompetencies(requiredComps);
            } else {
                // Return to showing ALL competencies if no role or no requirements
                loadCompetencies();
            }

        } catch (error) { 
            console.error(error); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleRatingChange = async (competencyId: string, level: number) => {
        if (!selectedUser || !canRate) return;
        
        // Optimistic update
        setSkills(prev => {
            const existing = prev.find(s => s.competencyId === competencyId);
            if (existing) {
                return prev.map(s => s.competencyId === competencyId ? { ...s, currentLevel: level } : s);
            } else {
                // Find competency details for full object
                const comp = allCompetencies.find(c => c.id === competencyId);
                if (!comp) return prev;
                return [...prev, { competencyId, currentLevel: level, competency: comp }];
            }
        });

        try {
            await CompetencyAPI.rateSkill({
                employeeId: selectedUser.id,
                competencyId,
                currentLevel: level
            });
        } catch (error) {
            console.error('Failed to save rating', error);
        }
    };

    // Group competencies by category
    const competenciesByCategory = allCompetencies.reduce((acc, curr) => {
        const cat = curr.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {} as Record<string, Competency[]>);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="md:col-span-1 border rounded-lg overflow-hidden bg-white h-[calc(100vh-8rem)] flex flex-col shadow-sm">
                <div className="p-4 border-b bg-gray-50 space-y-3">
                    <h3 className="font-semibold text-slate-800">Employees</h3>
                    
                    {/* Search */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search employees..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Department Filter */}
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="All">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>

                    <div className="text-xs text-slate-500 font-medium pt-1">
                        Showing {filteredUsers.length} employees
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">No employees found</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${
                                    selectedUser?.id === user.id 
                                        ? 'border-l-blue-600 bg-blue-50' 
                                        : 'border-l-transparent'
                                }`}
                            >
                                <div className="font-medium text-slate-900">{user.name}</div>
                                {user.designation && <div className="text-xs text-slate-500 mt-1">{user.designation}</div>}
                                {user.department && <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{user.department}</div>}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="md:col-span-3 bg-white rounded-lg border p-6 h-[600px] overflow-y-auto">
                {selectedUser ? (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{selectedUser.name}'s Skills</h2>
                            <div className="flex flex-col items-end gap-1">
                                <div className="text-sm text-gray-500">Rate skills from 1 (Basic) to 5 (Expert)</div>
                                {!canRate && (
                                    <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                                        View only mode. Admin/Reviewer access required to rate.
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading ? <div>Loading...</div> : (
                            <div className="space-y-8">
                                {Object.entries(competenciesByCategory).map(([category, comps]) => (
                                    <div key={category}>
                                        <h3 className="font-semibold text-lg text-gray-800 mb-3 border-b pb-2">{category}</h3>
                                        <div className="max-w-3xl"> 
                                            {comps.map(comp => {
                                                const userSkill = skills.find(s => s.competencyId === comp.id);
                                                const currentLevel = userSkill?.currentLevel || 0;
                                                return (
                                                    <div key={comp.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{comp.name}</div>
                                                            <div className="text-xs text-gray-500">{comp.id === 'desc-placeholder' ? 'desc' : ''}</div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map(level => (
                                                                <button
                                                                    key={level}
                                                                    disabled={!canRate}
                                                                    onClick={() => handleRatingChange(comp.id, level)}
                                                                    className={`w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                                                                        level <= currentLevel 
                                                                            ? 'bg-blue-600 text-white shadow-md' 
                                                                            : 'bg-gray-100 text-gray-400'
                                                                    } ${!canRate ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-200'}`}
                                                                >
                                                                    {level}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50">
                        Select an employee to manage skills
                    </div>
                )}
            </div>
        </div>
    );
}
