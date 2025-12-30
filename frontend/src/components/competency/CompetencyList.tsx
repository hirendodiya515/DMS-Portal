import { useState, useEffect } from 'react';
import { CompetencyAPI } from '../../lib/competency-api';
import { CompetencyTable } from './CompetencyTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface Competency {
    id: string;
    name: string;
    description: string;
    category: string;
    maxLevel: number;
}

export default function CompetencyList() {
    const { user } = useAuthStore();
    const [data, setData] = useState<Competency[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Technical',
        maxLevel: 5
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await CompetencyAPI.getCompetencies();
            setData(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await CompetencyAPI.updateCompetency(editingId, formData);
            } else {
                await CompetencyAPI.createCompetency(formData);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', description: '', category: 'Technical', maxLevel: 5 });
            loadData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (item: Competency) => {
        setFormData({
            name: item.name,
            description: item.description,
            category: item.category,
            maxLevel: item.maxLevel
        });
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this competency?')) return;
        try {
            await CompetencyAPI.deleteCompetency(id);
            loadData();
        } catch (error) {
            console.error(error);
        }
    };

    const columns: ColumnDef<Competency>[] = [
        { accessorKey: 'name', header: 'Competency Name' },
        { accessorKey: 'category', header: 'Category' },
        { accessorKey: 'maxLevel', header: 'Max Level' },
        { accessorKey: 'description', header: 'Description' },
        ...(user?.role === 'admin' || user?.role === 'reviewer' ? [{
            id: 'actions',
            cell: ({ row }) => (
                <div className="flex gap-2 justify-end">
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
                <h2 className="text-xl font-semibold">Competencies</h2>
                {(user?.role === 'admin' || user?.role === 'reviewer') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} /> Add Competency
                    </button>
                )}
            </div>

            <CompetencyTable columns={columns} data={data} />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Competency' : 'Add New Competency'}</h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ name: '', description: '', category: 'Technical', maxLevel: 5 }); }} className="text-gray-400 hover:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="Technical">Technical</option>
                                    <option value="Behavioral">Behavioral</option>
                                    <option value="Leadership">Leadership</option>
                                    <option value="Domain">Domain</option>
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
                                    onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ name: '', description: '', category: 'Technical', maxLevel: 5 }); }}
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
        </div>
    );
}
