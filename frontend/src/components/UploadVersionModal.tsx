import React, { useState } from 'react';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface UploadVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentId: string;
}

export default function UploadVersionModal({ isOpen, onClose, onSuccess, documentId }: UploadVersionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentId', documentId);
      if (changeNotes) {
        formData.append('changeNotes', changeNotes);
      }
      if (effectiveDate) {
        formData.append('effectiveDate', effectiveDate);
      }
      
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
      onClose();
      setFile(null);
      setChangeNotes('');
      setEffectiveDate('');
    } catch (err: any) {
      console.error('Failed to upload version:', err);
      setError(err.response?.data?.message || 'Failed to upload version');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Upload New Version</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Effective Date</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Change Notes (Optional)</label>
            <textarea
              rows={3}
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what changed in this version..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload File</label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 hover:bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-center">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <FileText className="w-6 h-6" />
                    <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Click or drag file to upload</p>
                  </>
                )}
              </div>
            </div>
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
              disabled={loading || !file}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Uploading...' : 'Upload Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
