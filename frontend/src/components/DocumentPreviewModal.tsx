import { useState, useEffect } from 'react';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
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
  const [docs, setDocs] = useState<{ uri: string; fileName: string; fileType?: string }[]>([]);
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
      const response = await api.get(`/files/${document.currentVersionId}/preview`, {
        responseType: 'blob'
      });
      
      let contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: contentType });
      
      let finalFileType: 'pdf' | 'docx' | 'xlsx' | 'image' | 'other' = 'other';
      const ext = document.title.split('.').pop()?.toLowerCase();

      if (contentType.includes('pdf')) {
        finalFileType = 'pdf';
      } else if (contentType.includes('wordprocessingml') || contentType.includes('msword')) {
        finalFileType = 'docx';
      } else if (contentType.includes('spreadsheetml') || contentType.includes('excel') || contentType.includes('sheet')) {
        finalFileType = 'xlsx';
      } else if (contentType.startsWith('image/')) {
        finalFileType = 'image';
      } else {
        // Fallback to extension check
        if (ext === 'pdf') finalFileType = 'pdf';
        else if (ext === 'docx' || ext === 'doc') finalFileType = 'docx';
        else if (ext === 'xlsx' || ext === 'xls') finalFileType = 'xlsx';
        else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) finalFileType = 'image';
      }

      // If it originated as a Word doc but backend sent a PDF, it's a PDF now
      if (finalFileType === 'docx' && contentType.includes('pdf')) {
        finalFileType = 'pdf';
      }

      if (finalFileType === 'docx') {
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            convertImage: mammoth.images.imgElement((image) => {
              return image.read("base64").then((imageBuffer) => {
                return {
                  src: `data:${image.contentType};base64,${imageBuffer}`
                };
              });
            })
          }
        );
        setHtmlContent(result.value);
      } else if (finalFileType === 'xlsx') {
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const data = jsonData.map((row: any) => 
          row.map((cell: any) => ({ value: cell, readOnly: true }))
        );
        setSpreadsheetData(data);
      } else if (finalFileType === 'pdf' || finalFileType === 'image') {
        const url = window.URL.createObjectURL(blob);
        setDocs([{ 
          uri: url, 
          fileName: document.title, 
          fileType: finalFileType === 'pdf' ? 'pdf' : contentType 
        }]);
      }

      setFileType(finalFileType);

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
      
      // Try to extract filename from Content-Disposition header
      let fileName = document.title;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
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
          <style dangerouslySetInnerHTML={{ __html: `
            .docx-preview table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 1rem;
            }
            .docx-preview table td, .docx-preview table th {
              border: 1px solid #e2e8f0;
              padding: 0.5rem;
            }
            .docx-preview img {
              max-width: 100%;
              height: auto;
              margin: 1rem 0;
            }
            .docx-preview p {
              margin-bottom: 1rem;
              line-height: 1.6;
            }
            .docx-preview h1, .docx-preview h2, .docx-preview h3 {
              font-weight: bold;
              margin-top: 1.5rem;
              margin-bottom: 0.75rem;
            }
            /* Fix for PDF duplicate text (react-pdf text layer) */
            .react-pdf__Page__textContent, .react-pdf__Page__annotations {
              /* Styles imported from react-pdf/dist/esm/Page/... */
            }
            .react-pdf__Page {
              position: relative !important;
              margin: 0 auto 20px auto !important;
              background-color: white !important;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
            }
          ` }} />
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
                <div className="bg-white p-8 shadow-sm rounded-lg min-h-full">
                  <div 
                    className="docx-preview prose max-w-none" 
                    dangerouslySetInnerHTML={{ __html: htmlContent }} 
                  />
                </div>
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
