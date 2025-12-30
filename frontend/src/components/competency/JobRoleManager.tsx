import { useState, useEffect } from 'react';
import { CompetencyAPI } from '../../lib/competency-api';
import api from '../../lib/api';
import { CompetencyTable } from './CompetencyTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, X, Edit, Trash2, ListChecks } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import JobRoleRequirementsModal from './JobRoleRequirementsModal';

interface JobRole {
    id: string;
    title: string;
    department: string;
    description: string;
}

export default function JobRoleManager() {
    const { user } = useAuthStore();
    const [data, setData] = useState<JobRole[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Requirements Modal State
    const [reqModalOpen, setReqModalOpen] = useState(false);
    const [selectedRoleForReq, setSelectedRoleForReq] = useState<{id: string, title: string} | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        department: '',
        description: ''
    });

    useEffect(() => {
        loadData();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/settings/departments');
            setDepartments(res.data || []);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const loadData = async () => {
        try {
            const res = await CompetencyAPI.getJobRoles();
            setData(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await CompetencyAPI.updateJobRole(editingId, formData);
            } else {
                await CompetencyAPI.createJobRole(formData);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ title: '', department: '', description: '' });
            loadData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (item: JobRole) => {
        setFormData({
            title: item.title,
            department: item.department,
            description: item.description
        });
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this job role?')) return;
        try {
            await CompetencyAPI.deleteJobRole(id);
            loadData();
        } catch (error) {
            console.error(error);
        }
    };

    const columns: ColumnDef<JobRole>[] = [
        { accessorKey: 'title', header: 'Role Title' },
        { accessorKey: 'department', header: 'Department' },
        { accessorKey: 'description', header: 'Description' },
        ...(user?.role === 'admin' || user?.role === 'reviewer' ? [{
            id: 'actions',
            cell: ({ row }) => (
                <div className="flex gap-2 justify-end">
                     <button
                        onClick={() => {
                            setSelectedRoleForReq({ id: row.original.id, title: row.original.title });
                            setReqModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                        title="Manage Requirements"
                    >
                        <ListChecks size={16} />
                    </button>
                    <button
                        onClick={() => handleEdit(row.original)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row.original.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }] : []),
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Job Roles</h2>
                {(user?.role === 'admin' || user?.role === 'reviewer') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} /> Add Role
                    </button>
                )}
            </div>

            <CompetencyTable columns={columns} data={data} />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Job Role' : 'Add New Job Role'}</h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ title: '', department: '', description: '' }); }} className="text-gray-400 hover:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept} value={dept}>
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ title: '', department: '', description: '' }); }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Requirements Modal */}
            {selectedRoleForReq && (
                <JobRoleRequirementsModal 
                    isOpen={reqModalOpen} 
                    onClose={() => { setReqModalOpen(false); setSelectedRoleForReq(null); }} 
                    roleId={selectedRoleForReq.id} 
                    roleTitle={selectedRoleForReq.title} 
                />
            )}
        </div>
    );
}
