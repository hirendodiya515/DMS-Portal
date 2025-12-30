import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import OrgChartTree from '../components/OrgChartTree';
import { CompetencyAPI } from '../lib/competency-api';
import {
    Search,
    Upload,
    RotateCcw,
    X,
    UserPlus,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface OrgNode {
    id: string;
    parentId: string | null;
    name: string;
    designation?: string;
    department?: string;
    photoUrl?: string;
    jobRoleId?: string;
}

export default function OrgChartPage() {
    const user = useAuthStore((state) => state.user);
    const isAdmin = user?.role === 'admin';

    const [nodes, setNodes] = useState<OrgNode[]>([]);
    const [treeData, setTreeData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredRootId, setFilteredRootId] = useState<string | null>(null);

    // Modal State
    const [editNode, setEditNode] = useState<OrgNode | null>(null); // Node being edited or parent of new node
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    useEffect(() => {
        fetchNodes();
    }, []);

    const fetchNodes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/org-chart');
            setNodes(res.data);
        } catch (error) {
            console.error('Failed to fetch org chart:', error);
        } finally {
            setLoading(false);
        }
    };

    // Build the tree from flat nodes
    const buildTree = (flatNodes: OrgNode[], rootId: string | null = null) => {
        if (!flatNodes.length) return null;

        const map = new Map();
        const roots: any[] = [];

        // Initialize
        flatNodes.forEach(node => {
            map.set(node.id, {
                ...node,
                attributes: {
                    designation: node.designation,
                    department: node.department,
                    photoUrl: node.photoUrl
                },
                children: [] 
            });
        });

        // Link
        flatNodes.forEach(node => {
            const mappedNode = map.get(node.id);
            if (node.parentId && map.has(node.parentId)) {
                map.get(node.parentId).children.push(mappedNode);
            } else {
                roots.push(mappedNode);
            }
        });

        // If filtering by specific root
        if (rootId) {
             return map.get(rootId) || null;
        }

        return roots.length > 0 ? roots[0] : null; // Assume single root CEO
    };

    // Re-build tree whenever nodes or filter changes
    useEffect(() => {
        const tree = buildTree(nodes, filteredRootId);
        setTreeData(tree);
    }, [nodes, filteredRootId]);


    // Handlers
    const handleSearchSelect = (nodeId: string) => {
        setFilteredRootId(nodeId);
        setSearchQuery(''); 
    };

    const handleReset = () => {
        setFilteredRootId(null);
        setSearchQuery('');
    };

    // Admin: Bulk Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map Excel columns to Entity
                const mappedNodes = data.map((item: any) => ({
                    id: String(item.ID || item.id), // Ensure string
                    parentId: item.ParentID || item.parentId ? String(item.ParentID || item.parentId) : null,
                    name: item.Name || item.name,
                    designation: item.Designation || item.designation,
                    department: item.Department || item.department,
                    photoUrl: item.Photo || item.photo || item.PhotoUrl
                }));

                await api.post('/org-chart/bulk', mappedNodes);
                fetchNodes(); 
                alert('Upload successful!');
            } catch (err) {
                console.error(err);
                alert('Failed to process file.');
            }
        };
        reader.readAsBinaryString(file);
    };
    
    // Admin: Node Click
    const handleNodeClick = (nodeDatum: any) => {
        if (!isAdmin) return; // Only admin can edit
        const node = nodes.find(n => n.id === nodeDatum.id);
        if (node) {
            setEditNode(node);
            setModalMode('edit');
            setIsEditModalOpen(true);
        }
    };

    // Filter suggestions
    const suggestions = searchQuery.length > 0
        ? nodes.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    return (
        <div className="h-full flex flex-col relative">
            {/* Header / Toolbar */}
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-800">Organization Chart</h1>
                    
                    {/* Search */}
                    <div className="relative">
                        <div className="relative">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                             <input 
                                type="text"
                                placeholder="Find person..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                             />
                        </div>
                        {/* Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                             <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                                 {suggestions.map(node => (
                                     <div 
                                        key={node.id}
                                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                                        onClick={() => handleSearchSelect(node.id)}
                                     >
                                         <div className="font-medium text-slate-700">{node.name}</div>
                                         <div className="text-xs text-slate-500">{node.designation}</div>
                                     </div>
                                 ))}
                             </div>
                        )}
                    </div>

                    {filteredRootId && (
                        <button 
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset View
                        </button>
                    )}
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setEditNode(null);
                                setModalMode('add');
                                setIsEditModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition text-sm font-medium shadow-sm"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Person
                        </button>
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition cursor-pointer text-sm font-medium">
                            <Upload className="w-4 h-4" />
                            Upload Excel
                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        </label>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <span className="text-xs text-slate-400 font-medium px-2">Admin Mode Active</span>
                    </div>
                )}
            </div>

            {/* Tree Area */}
            <div className="flex-1 bg-slate-50 relative overflow-hidden">
                <OrgChartTree 
                    data={treeData} 
                    isLoading={loading} 
                    onNodeClick={handleNodeClick}
                />
            </div>

            {/* Admin Modal */}
            {isEditModalOpen && (
               <AdminNodeModal 
                  mode={modalMode}
                  node={editNode} 
                  nodes={nodes}
                  onClose={() => setIsEditModalOpen(false)}
                  onSuccess={() => {
                      fetchNodes();
                      setIsEditModalOpen(false);
                      setEditNode(null);
                  }}
               />
            )}
        </div>
    );
}

// Sub-component for Admin Modal
function AdminNodeModal({ mode, node, nodes, onClose, onSuccess }: any) {
    const [jobRoles, setJobRoles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: node?.name || '',
        designation: node?.designation || '',
        department: node?.department || '',
        photoUrl: node?.photoUrl || '',
        parentId: node?.parentId || '',
        jobRoleId: node?.jobRoleId || ''
    });

    useEffect(() => {
        fetchJobRoles();
        fetchDepartments();
    }, []);

    // Reset form when opening for "Add"
    useEffect(() => {
        if (mode === 'add') {
             setFormData({
                name: '',
                designation: '',
                department: '',
                photoUrl: '',
                parentId: node?.id || '', // If adding "under" someone
                jobRoleId: ''
             });
        }
    }, [mode, node]);

    const fetchJobRoles = async () => {
        try {
            const res = await CompetencyAPI.getJobRoles();
            setJobRoles(res.data);
        } catch (error) {
            console.error('Failed to fetch job roles:', error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/settings/departments');
            setDepartments(res.data || []);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
            // Fallback
            setDepartments(['HR', 'IT', 'Finance', 'Operations', 'Quality']);
        }
    };

    const handleDelete = async () => {
        if(!confirm('Are you sure you want to delete this person? This might detach their children!')) return;
        try {
            await api.delete(`/org-chart/${node.id}`);
            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Failed to delete');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (mode === 'add') {
                 await api.post('/org-chart', formData);
            } else {
                 await api.put(`/org-chart/${node.id}`, formData);
            }
            onSuccess();
        } catch (err) { 
            console.error(err);
            alert('Failed to save');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                     <h2 className="text-lg font-bold text-slate-800">{mode === 'edit' ? 'Edit Employee' : 'Add Employee'}</h2>
                     <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                 </div>
                 
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                         <input 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            required 
                            placeholder="John Doe"
                         />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Designation (Display Role)</label>
                         <input 
                            value={formData.designation} 
                            onChange={e => setFormData({...formData, designation: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="Software Engineer"
                         />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                         <select 
                            value={formData.department} 
                            onChange={e => setFormData({...formData, department: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                         >
                             <option value="">-- Select Department --</option>
                             {departments.map((dept) => (
                                 <option key={dept} value={dept}>{dept}</option>
                             ))}
                         </select>
                     </div>
                     
                     <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                         <label className="block text-sm font-bold text-blue-900 mb-1">Competency Job Role</label>
                         <p className="text-xs text-blue-700 mb-2">Assigning a role here links this employee to skill requirements and assessments.</p>
                         <select 
                             value={formData.jobRoleId || ''}
                             onChange={e => setFormData({...formData, jobRoleId: e.target.value})}
                             className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                         >
                             <option value="">-- No Competency Role Assigned --</option>
                             {jobRoles.map((role: any) => (
                                 <option key={role.id} value={role.id}>{role.title}</option>
                             ))}
                         </select>
                     </div>

                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Manager (Reports To)</label>
                         <select 
                             value={formData.parentId || ''}
                             onChange={e => setFormData({...formData, parentId: e.target.value})}
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                         >
                             <option value="">No Manager (Root)</option>
                             {nodes.filter((n: any) => mode === 'add' || n.id !== node.id).map((n: any) => (
                                 <option key={n.id} value={n.id}>{n.name} - {n.designation}</option>
                             ))}
                         </select>
                     </div>

                     <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                         {mode === 'edit' && (
                             <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition">Delete</button>
                         )}
                         <button type="submit" className={`px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition flex-1 ${mode === 'add' ? 'w-full' : ''}`}>
                             {mode === 'edit' ? 'Save Changes' : 'Add Person'}
                         </button>
                     </div>
                 </form>
             </div>
        </div>
    );
}
