import { useState, useEffect } from 'react';
import { CompetencyAPI } from '../../lib/competency-api';
import api from '../../lib/api';
import { CompetencyTable } from './CompetencyTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, X, Calendar } from 'lucide-react';

interface TrainingProgram {
    id: string;
    name: string;
    provider: string;
    duration: string;
    targetCompetency?: {
        name: string;
        id: string;
    };
}

interface TrainingPlan {
    id: string;
    user: {
        firstName: string;
        lastName: string;
    };
    trainingProgram: {
        name: string;
    };
    status: string;
    dueDate: string;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
}

export default function TrainingManager() {
    const [subTab, setSubTab] = useState<'programs' | 'plans'>('plans'); // Default to plans maybe?
    const [programs, setPrograms] = useState<TrainingProgram[]>([]);
    const [plans, setPlans] = useState<TrainingPlan[]>([]);
    
    // Modal states
    const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Filter by user for plans? For now load all relevant plans (need API endpoint for all plans or filter locally if needed)
    // The API I made `getTrainingPlan(userId)` returns plans for ONE user.
    // I probably need `getAllTrainingPlans()` for HR view.
    // I'll stick to listing programs for now, and maybe list plans for a selected user? 
    // Or simpler: Just a list of programs. And a way to assign.
    // Let's implement full HR view for Training Plans.
    // I need to update API to support getting ALL plans.

    // Let's default to just Programs management as per previous step, but add Assignment within it.
    
    // Actually, let's keep it simple. Two sections.
    
    useEffect(() => {
        loadPrograms();
        // loadPlans(); // Need endpoint
    }, []);

    const loadPrograms = async () => {
        try {
            const res = await CompetencyAPI.getTrainingPrograms();
            setPrograms(res.data);
        } catch (error) { console.error(error); }
    };

    // Form data for creating program
    const [programForm, setProgramForm] = useState({ name: '', provider: '', duration: '', description: '' });

    const handleCreateProgram = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await CompetencyAPI.createTrainingProgram(programForm);
            setIsProgramModalOpen(false);
            setProgramForm({ name: '', provider: '', duration: '', description: '' });
            loadPrograms();
        } catch (error) { console.error(error); }
    };

    const columnsPrograms: ColumnDef<TrainingProgram>[] = [
        { accessorKey: 'name', header: 'Program Name' },
        { accessorKey: 'provider', header: 'Provider' },
        { accessorKey: 'duration', header: 'Duration' },
        { accessorKey: 'targetCompetency.name', header: 'Target Competency' },
    ];

    return (
        <div>
            <div className="flex gap-4 mb-6 border-b pb-1">
                <button 
                    onClick={() => setSubTab('plans')}
                    className={`px-4 py-2 font-medium ${subTab === 'plans' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                >
                    Training Schedule
                </button>
                <button 
                    onClick={() => setSubTab('programs')}
                    className={`px-4 py-2 font-medium ${subTab === 'programs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                >
                    Programs Library
                </button>
            </div>

            {subTab === 'programs' && (
                <div>
                   <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Training Programs</h2>
                        <button
                            onClick={() => setIsProgramModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={20} /> New Program
                        </button>
                    </div>
                    <CompetencyTable columns={columnsPrograms} data={programs} />
                </div>
            )}

            {subTab === 'plans' && (
                 <div className="text-center py-10 bg-gray-50 border border-dashed rounded-lg">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Training Schedule</h3>
                    <p className="max-w-md mx-auto mt-2 text-gray-500">
                        View and manage assigned training plans for employees. 
                        To assign training, please go to 'Gap Analysis' or use the 'Assign' button here (Implementation pending API update for bulk fetch).
                    </p>
                    {/* Placeholder for now as I don't have getAllPlans API */}
                </div>
            )}

             {/* Program Modal */}
             {isProgramModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">Create Training Program</h3>
                            <button onClick={() => setIsProgramModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProgram} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={programForm.name}
                                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={programForm.provider}
                                    onChange={(e) => setProgramForm({ ...programForm, provider: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="e.g. 2 days"
                                    value={programForm.duration}
                                    onChange={(e) => setProgramForm({ ...programForm, duration: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsProgramModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
