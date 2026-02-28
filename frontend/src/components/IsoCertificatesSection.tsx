import React, { useEffect, useRef, useState } from 'react';
import { Upload, Eye, FileCheck, Leaf, ShieldCheck, BookOpen, ChevronDown, X, Check } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CertCard {
    key: string;
    label: string;
    sub: string;
    icon: React.ElementType;
    color: string;       // text colour
    bg: string;          // icon bg
    border: string;      // card border accent
    gradient: string;    // top-border gradient
    type: 'upload' | 'select';
}

const CARDS: CertCard[] = [
    {
        key: 'iso_cert_9001',
        label: 'ISO 9001',
        sub: 'Quality Management',
        icon: FileCheck,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        gradient: 'from-blue-500 to-blue-600',
        type: 'upload',
    },
    {
        key: 'iso_cert_14001',
        label: 'ISO 14001',
        sub: 'Environmental',
        icon: Leaf,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        gradient: 'from-emerald-500 to-emerald-600',
        type: 'upload',
    },
    {
        key: 'iso_cert_45001',
        label: 'ISO 45001',
        sub: 'Occupational Health & Safety',
        icon: ShieldCheck,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        gradient: 'from-orange-500 to-orange-600',
        type: 'upload',
    },
    {
        key: 'quality_policy_doc',
        label: 'Policy',
        sub: 'Company Policy',
        icon: BookOpen,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-100',
        gradient: 'from-purple-500 to-purple-600',
        type: 'select',
    },
];

interface DocOption {
    id: string;
    title: string;
    documentNumber?: string;
    currentVersionId?: string;
}

export default function IsoCertificatesSection() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    // filePath stored per key:  iso_cert_9001 → "uploads/xxx.pdf"
    // For quality_policy_doc we store the versionId so we can preview via /files/:versionId/preview
    const [paths, setPaths] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [showPicker, setShowPicker] = useState(false);
    const [docs, setDocs] = useState<DocOption[]>([]);
    const [docSearch, setDocSearch] = useState('');
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Load stored settings on mount
    useEffect(() => {
        const keys = CARDS.map(c => c.key);
        Promise.all(keys.map(k => api.get(`/settings/${k}`).catch(() => ({ data: null })))).then(results => {
            const map: Record<string, string> = {};
            keys.forEach((k, i) => {
                if (results[i].data) map[k] = results[i].data;
            });
            setPaths(map);
        });
    }, []);

    // Fetch documents for quality policy picker
    const openPicker = async () => {
        try {
            const res = await api.get('/documents', { params: { limit: 200 } });
            const list: DocOption[] = (res.data?.data || res.data || []).map((d: any) => ({
                id: d.id,
                title: d.title,
                documentNumber: d.documentNumber,
                currentVersionId: d.currentVersionId,
            }));
            setDocs(list);
            setShowPicker(true);
            setDocSearch('');
        } catch (e) {
            console.error('Failed to load documents', e);
        }
    };

    const selectDoc = async (doc: DocOption) => {
        if (!doc.id) return;
        try {
            // Store the Document ID, not the Version ID, so we always fetch the latest version
            await api.post('/settings/quality_policy_doc', { value: doc.id });
            setPaths(prev => ({ ...prev, quality_policy_doc: doc.id }));
            setShowPicker(false);
        } catch (e) {
            console.error('Failed to save quality policy setting', e);
        }
    };

    const handleFileUpload = async (cardKey: string, file: File) => {
        setUploading(prev => ({ ...prev, [cardKey]: true }));
        try {
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await api.post('/files/upload-generic', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const filePath: string = uploadRes.data.path; // e.g., "uploads/xxx.pdf"

            // Save to settings
            await api.post(`/settings/${cardKey}`, { value: filePath });
            setPaths(prev => ({ ...prev, [cardKey]: filePath }));
        } catch (e) {
            console.error('Upload failed', e);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(prev => ({ ...prev, [cardKey]: false }));
        }
    };

    const handleView = async (card: CertCard) => {
        const stored = paths[card.key];
        if (!stored) return;

        if (card.type === 'upload') {
            window.open(`${BASE_URL}/files/${stored}`, '_blank');
        } else {
            try {
                // `stored` is the Document ID. Fetch the document to get the latest version ID.
                const docRes = await api.get(`/documents/${stored}`);
                const latestVersionId = docRes.data?.currentVersionId;
                
                if (!latestVersionId) {
                    alert('This document does not have an uploaded file yet.');
                    return;
                }

                // Fetch the actual file blob
                const response = await api.get(`/files/${latestVersionId}/preview`, { responseType: 'blob' });
                
                const blob = new Blob([response.data], { type: response.headers['content-type'] });
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => window.URL.revokeObjectURL(url), 10000);
            } catch (error) {
                console.error('Failed to preview document:', error);
                
                // Fallback for backwards compatibility: if `stored` was actually a versionId and not a documentId, 
                // the /documents/${stored} call above would fail with a 404. We can try to fetch it as a versionId.
                if (error && (error as any).response?.status === 404) {
                    try {
                        const fallbackResponse = await api.get(`/files/${stored}/preview`, { responseType: 'blob' });
                        const blob = new Blob([fallbackResponse.data], { type: fallbackResponse.headers['content-type'] });
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
                        return;
                    } catch (fallbackError) {
                        console.error('Fallback preview failed', fallbackError);
                    }
                }
                
                alert('Failed to load preview document. You might not have permission, or it was deleted.');
            }
        }
    };

    const filteredDocs = docs.filter(d =>
        d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
        (d.documentNumber || '').toLowerCase().includes(docSearch.toLowerCase())
    );

    return (
        <div className="flex flex-wrap gap-3 items-start">
            {CARDS.map(card => {
                const Icon = card.icon;
                const isUploading = uploading[card.key];
                const hasFile = !!paths[card.key];

                return (
                    <div
                        key={card.key}
                        className={`relative bg-white rounded-xl border ${card.border} shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group`}
                        style={{ minWidth: '150px', flex: '1 1 auto' }}
                    >
                        {/* Top accent bar */}
                        <div className={`h-1 w-full bg-gradient-to-r ${card.gradient}`} />

                        {/* Admin Action Button (Absolute Top Right) */}
                        {isAdmin && (
                            <div className="absolute top-2 right-2 z-10">
                                {card.type === 'upload' ? (
                                    <>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            className="hidden"
                                            ref={el => { fileRefs.current[card.key] = el; }}
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileUpload(card.key, file);
                                                e.target.value = '';
                                            }}
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileRefs.current[card.key]?.click();
                                            }}
                                            disabled={isUploading}
                                            title="Upload certificate"
                                            className="p-1.5 rounded-md bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-100 shadow-sm transition-colors backdrop-blur-sm"
                                        >
                                            {isUploading ? (
                                                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Upload className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openPicker();
                                        }}
                                        title="Select from documents"
                                        className="p-1.5 rounded-md bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-100 shadow-sm transition-colors backdrop-blur-sm"
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Clickable Area for Viewing */}
                        <button 
                            className="p-3 w-full text-left flex items-center justify-between"
                            onClick={() => handleView(card)}
                            disabled={!hasFile}
                            title={hasFile ? 'Click to view document' : 'No document uploaded yet'}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={`${card.bg} p-2 rounded-lg`}>
                                    <Icon className={`w-4 h-4 ${card.color}`} />
                                </div>
                                <div className="min-w-0 pr-6">
                                    <p className={`text-sm font-semibold ${card.color} whitespace-nowrap truncate leading-tight`}>{card.label}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${hasFile ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{hasFile ? 'Uploaded' : 'Pending'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* View Indicator Icon shown only when uploaded and hovered (to suggest clickability) */}
                            {hasFile && (
                                <Eye className={`w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity`} />
                            )}
                        </button>
                    </div>
                );
            })}

            {/* Document Picker Modal */}
            {showPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-semibold text-slate-800">Select Policy</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Pick a document from the system</p>
                            </div>
                            <button
                                onClick={() => setShowPicker(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-5 py-3 border-b border-slate-100">
                            <input
                                type="text"
                                placeholder="Search by title or document number..."
                                value={docSearch}
                                onChange={e => setDocSearch(e.target.value)}
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                                autoFocus
                            />
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto max-h-64">
                            {filteredDocs.length === 0 ? (
                                <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
                                    No documents found
                                </div>
                            ) : (
                                filteredDocs.map(doc => {
                                    const isSelected = paths['quality_policy_doc'] === doc.currentVersionId;
                                    return (
                                        <button
                                            key={doc.id}
                                            onClick={() => selectDoc(doc)}
                                            className={`w-full flex items-center justify-between px-5 py-3 text-left hover:bg-purple-50 transition-colors border-b border-slate-50 last:border-0
                                                ${isSelected ? 'bg-purple-50' : ''}`}
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 leading-tight">{doc.title}</p>
                                                {doc.documentNumber && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{doc.documentNumber}</p>
                                                )}
                                                {!doc.currentVersionId && (
                                                    <p className="text-xs text-amber-500 mt-0.5">No file attached</p>
                                                )}
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
