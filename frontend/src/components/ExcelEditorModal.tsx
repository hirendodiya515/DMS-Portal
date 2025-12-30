import React, { useState, useEffect } from 'react';
import Spreadsheet from 'react-spreadsheet';
import { X, Save, Loader2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';

interface ExcelEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: {
    id: string;
    title: string;
    currentVersionId?: string;
  } | null;
}

export default function ExcelEditorModal({ isOpen, onClose, onSuccess, document }: ExcelEditorModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && document) {
      loadFile();
    }
  }, [isOpen, document]);

  const loadFile = async () => {
    if (!document || !document.currentVersionId) {
      setError('No document version available to edit.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      // Fetch file as blob
      const response = await api.get(`/files/${document.currentVersionId}/download`, {
        responseType: 'blob'
      });
      
      const file = response.data;
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON array of arrays for react-spreadsheet
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Map to react-spreadsheet format: { value: cellValue }
      const spreadsheetData = jsonData.map((row: any) => 
        row.map((cell: any) => ({ value: cell }))
      );
      
      setData(spreadsheetData);
    } catch (err) {
      console.error('Failed to load Excel file:', err);
      setError('Failed to load Excel file. Please ensure it is a valid .xlsx file.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!document) return;
    setSaving(true);
    setError('');

    try {
      // Convert back to simple array of arrays
      const aoa = data.map(row => row.map((cell: any) => cell?.value || ''));
      
      // Create workbook
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      
      // Write to buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', blob, `${document.title}.xlsx`);
      formData.append('documentId', document.id);
      formData.append('changeNotes', 'Edited via Web Editor');
      
      // Upload as new version
      await api.post('/files/upload-version', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save changes:', err);
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0 bg-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{document.title}</h2>
              <p className="text-xs text-slate-500">Excel Web Editor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-4 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={loadFile} className="text-blue-600 hover:underline">Try Again</button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <Spreadsheet data={data} onChange={setData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
