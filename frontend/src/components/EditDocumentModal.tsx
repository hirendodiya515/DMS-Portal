import React, { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import api from '../lib/api';

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: {
    id: string;
    title: string;
    documentNumber?: string | null;
    description: string;
    type: string;
    departments: string[];
    reviewDate?: string;
  } | null;
}

export default function EditDocumentModal({ isOpen, onClose, onSuccess, document }: EditDocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    documentNumber: '',
    description: '',
    type: '',
    departments: '',
    reviewDate: '',
  });
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [docTypesList, setDocTypesList] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && document) {
      setFormData({
        title: document.title,
        documentNumber: document.documentNumber || '',
        description: document.description,
        type: document.type,
        departments: document.departments.join(', '),
        reviewDate: document.reviewDate ? new Date(document.reviewDate).toISOString().split('T')[0] : '',
      });
      fetchSettings();
    }
  }, [isOpen, document]);

  const fetchSettings = async () => {
    try {
      const [deptRes, typeRes] = await Promise.all([
        api.get('/settings/departments'),
        api.get('/settings/document_types')
      ]);
      setDepartmentsList(deptRes.data || []);
      setDocTypesList(typeRes.data || []);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      // Fallback defaults
      setDepartmentsList(['HR', 'IT', 'Finance', 'Operations', 'Quality']);
      setDocTypesList(['Policy', 'Procedure', 'Work Instruction', 'Form', 'Record']);
    }
  };

  if (!isOpen || !document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.put(`/documents/${document.id}`, {
        title: formData.title,
        documentNumber: formData.documentNumber,
        description: formData.description,
        type: formData.type,
        departments: formData.departments.split(',').map(d => d.trim()).filter(Boolean),
        reviewDate: formData.reviewDate || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update document:', err);
      setError(err.response?.data?.message || 'Failed to update document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800">Edit Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Document Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Document Number</label>
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. POL-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
              >
                {docTypesList.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Departments</label>
              <select
                value={formData.departments}
                onChange={(e) => setFormData({ ...formData, departments: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                 <option value="">Select Department</option>
                 {departmentsList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
               <p className="text-xs text-slate-500 mt-1">Currently: {document.departments.join(', ')}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Next Review Date</label>
            <input
              type="date"
              value={formData.reviewDate}
              onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
