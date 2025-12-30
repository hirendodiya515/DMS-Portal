import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { CompetencyAPI } from '../../lib/competency-api';

interface JobRoleRequirementsModalProps {
    isOpen: boolean;
    onClose: () => void;
    roleId: string;
    roleTitle: string;
}

interface Requirement {
    id?: string;
    competencyId: string;
    competency: {
        id: string;
        name: string;
        category: string;
    };
    requiredLevel: number;
}

interface Competency {
    id: string;
    name: string;
    category: string;
}

export default function JobRoleRequirementsModal({ isOpen, onClose, roleId, roleTitle }: JobRoleRequirementsModalProps) {
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [allCompetencies, setAllCompetencies] = useState<Competency[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // New Requirement Form
    const [selectedCompetencyId, setSelectedCompetencyId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState(1);

    useEffect(() => {
        if (isOpen && roleId) {
            loadData();
        }
    }, [isOpen, roleId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reqRes, compRes] = await Promise.all([
                CompetencyAPI.getRequirements(roleId),
                CompetencyAPI.getCompetencies()
            ]);
            setRequirements(reqRes.data);
            setAllCompetencies(compRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRequirement = async () => {
        if (!selectedCompetencyId) return;
        setSaving(true);
        try {
            await CompetencyAPI.addRequirement({
                jobRoleId: roleId,
                competencyId: selectedCompetencyId,
                requiredLevel: Number(selectedLevel)
            });
            // Refresh
            const res = await CompetencyAPI.getRequirements(roleId);
            setRequirements(res.data);
            // Reset form
            setSelectedCompetencyId('');
            setSelectedLevel(1);
        } catch (error) {
            console.error('Failed to add requirement:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveRequirement = async (competencyId: string) => {
        if (!window.confirm('Remove this competency requirement?')) return;
        try {
            await CompetencyAPI.deleteRequirement(roleId, competencyId);
            setRequirements(prev => prev.filter(r => r.competency.id !== competencyId));
        } catch (error) {
            console.error('Failed to remove requirement:', error);
        }
    };

    if (!isOpen) return null;

    // Filter out already added competencies from dropdown
    const availableCompetencies = allCompetencies.filter(
        c => !requirements.some(r => r.competency.id === c.id)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">Manage Requirements</h3>
                        <p className="text-sm text-gray-500">For Role: <span className="font-medium text-blue-600">{roleTitle}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Add New Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                            <Plus size={16} /> Add Competency
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={selectedCompetencyId}
                                onChange={(e) => setSelectedCompetencyId(e.target.value)}
                            >
                                <option value="">Select Competency...</option>
                                {availableCompetencies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                                ))}
                            </select>
                            <div className="w-full sm:w-32">
                                <select
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    value={selectedLevel}
                                    onChange={(e) => setSelectedLevel(Number(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5].map(l => (
                                        <option key={l} value={l}>Level {l}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAddRequirement}
                                disabled={!selectedCompetencyId || saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 justify-center"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                Add
                            </button>
                        </div>
                    </div>

                    {/* List Section */}
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Current Requirements ({requirements.length})</h4>
                        {loading ? (
                            <div className="text-center py-8 text-slate-500">Loading requirements...</div>
                        ) : requirements.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                                No competencies assigned to this role yet.
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-slate-600">Competency</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">Category</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">Required Level</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {requirements.map(req => (
                                            <tr key={req.competency.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium">{req.competency.name}</td>
                                                <td className="px-4 py-3 text-slate-500">{req.competency.category}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                                        {req.requiredLevel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleRemoveRequirement(req.competency.id)}
                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
