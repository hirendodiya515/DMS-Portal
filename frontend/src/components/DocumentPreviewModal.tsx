import React, { useState, useEffect } from 'react';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import { X, Download, Loader2 } from 'lucide-react';
import api from '../lib/api';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Spreadsheet from 'react-spreadsheet';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    title: string;
    type: string;
    currentVersionId?: string;
    url?: string;
  } | null;
}

export default function DocumentPreviewModal({ isOpen, onClose, document }: DocumentPreviewModalProps) {
  const [docs, setDocs] = useState<{ uri: string; fileName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom content states
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<any[]>([]);
  const [fileType, setFileType] = useState<'pdf' | 'docx' | 'xlsx' | 'image' | 'other'>('other');

  useEffect(() => {
    if (isOpen && document) {
      fetchFile();
    } else {
      setDocs([]);
      setHtmlContent(null);
      setSpreadsheetData([]);
      setFileType('other');
    }
  }, [isOpen, document]);

  const fetchFile = async () => {
    if (!document || !document.currentVersionId) {
      setError('No document version available to preview.');
      return;
    }
    setLoading(true);
    setError('');
    setHtmlContent(null);
    setSpreadsheetData([]);

    try {
      const response = await api.get(`/files/${document.currentVersionId}/download`, {
        responseType: 'blob'
      });
      
      const contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: contentType });
      
      let detectedType: 'pdf' | 'docx' | 'xlsx' | 'image' | 'other' = 'other';
      
      if (contentType.includes('pdf')) {
        detectedType = 'pdf';
      } else if (contentType.includes('wordprocessingml') || contentType.includes('msword')) {
        detectedType = 'docx';
      } else if (contentType.includes('spreadsheetml') || contentType.includes('excel') || contentType.includes('sheet')) {
        detectedType = 'xlsx';
      } else if (contentType.startsWith('image/')) {
        detectedType = 'image';
      } else {
        // Fallback to extension check if content-type is generic
        const ext = document.title.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') detectedType = 'pdf';
        else if (ext === 'docx' || ext === 'doc') detectedType = 'docx';
        else if (ext === 'xlsx' || ext === 'xls') detectedType = 'xlsx';
        else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) detectedType = 'image';
      }

      setFileType(detectedType);

      if (detectedType === 'docx') {
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtmlContent(result.value);
      } else if (detectedType === 'xlsx') {
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const data = jsonData.map((row: any) => 
          row.map((cell: any) => ({ value: cell, readOnly: true }))
        );
        setSpreadsheetData(data);
      } else if (detectedType === 'pdf' || detectedType === 'image') {
        const url = window.URL.createObjectURL(blob);
        setDocs([{ uri: url, fileName: document.title }]);
      }

    } catch (err) {
      console.error('Failed to load document for preview:', err);
      setError('Failed to load document. Please try downloading it instead.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !document) return null;
  
  const handleDownload = async () => {
    if (!document.currentVersionId) return;
    
    try {
      const response = await api.get(`/files/${document.currentVersionId}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.title);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0 bg-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">{document.title}</h2>
            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium uppercase">
              {document.type}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Download Original"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 relative p-4">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-600">
              {error}
            </div>
          ) : (
            <>
              {fileType === 'docx' && htmlContent && (
                <div className="prose max-w-none bg-white p-8 shadow-sm rounded-lg min-h-full" dangerouslySetInnerHTML={{ __html: htmlContent }} />
              )}
              
              {fileType === 'xlsx' && spreadsheetData.length > 0 && (
                <div className="bg-white shadow-sm rounded-lg overflow-auto">
                  <Spreadsheet data={spreadsheetData} />
                </div>
              )}

              {(fileType === 'pdf' || fileType === 'image') && (
                <div className="h-full">
                   <DocViewer 
                    documents={docs} 
                    pluginRenderers={DocViewerRenderers}
                    style={{ height: '100%' }}
                    config={{
                      header: {
                        disableHeader: true,
                        disableFileName: true,
                        retainURLParams: false
                      }
                    }}
                  />
                </div>
              )}
              
              {fileType === 'other' && (
                 <div className="flex items-center justify-center h-full text-slate-500">
                   Preview not available for this file type. Please download to view.
                 </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
