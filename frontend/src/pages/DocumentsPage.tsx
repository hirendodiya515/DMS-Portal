import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Edit,
  FileSpreadsheet,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

interface Document {
  id: string;
  documentNumber: string | null;
  title: string;
  description: string;
  type: string;
  status: string;
  departments: string[];
  version: number;
  updatedAt: string;
  currentVersionId?: string;
  owner: {
    firstName: string;
    lastName: string;
  };
}

import { useNavigate } from 'react-router-dom';
import CreateDocumentModal from '../components/CreateDocumentModal';
import EditDocumentModal from '../components/EditDocumentModal';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import ExcelEditorModal from '../components/ExcelEditorModal';
import ActionMenu from '../components/ActionMenu';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [isExcelEditorOpen, setIsExcelEditorOpen] = useState(false);
  const [excelDocument, setExcelDocument] = useState<Document | null>(null);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Document; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doc: Document) => {
    setEditingDocument(doc);
    setIsEditModalOpen(true);
    setActiveMenuDocId(null);
  };

  const handlePreview = (doc: Document) => {
    setPreviewDocument(doc);
    setIsPreviewModalOpen(true);
    setActiveMenuDocId(null);
  };

  const handleExcelEdit = (doc: Document) => {
    setExcelDocument(doc);
    setIsExcelEditorOpen(true);
    setActiveMenuDocId(null);
  };

  // ... (keep existing helper functions)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-3 h-3 mr-1" />;
      case 'rejected': return <XCircle className="w-3 h-3 mr-1" />;
      case 'under_review': return <Clock className="w-3 h-3 mr-1" />;
      default: return <AlertCircle className="w-3 h-3 mr-1" />;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (doc.documentNumber && doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    
    // Handle special cases or nested properties if needed
    // For now assuming direct properties on Document interface
    let aValue = a[key];
    let bValue = b[key];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: keyof Document) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.currentVersionId) {
      alert('No file version available to download.');
      return;
    }
    
    try {
      const response = await api.get(`/files/${doc.currentVersionId}/download`, {
        responseType: 'blob',
      });
      
      // Try to extract filename from Content-Disposition header
      let fileName = doc.title;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file.');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/documents/${doc.id}`);
      setDocuments(documents.filter(d => d.id !== doc.id));
      setActiveMenuDocId(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-500 mt-1">Manage and track all your compliance documents</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition shadow-lg shadow-blue-500/30 font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Document
        </button>
      </div>

      <CreateDocumentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchDocuments}
      />

      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchDocuments}
        document={editingDocument}
      />

      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={previewDocument}
      />

      <ExcelEditorModal
        isOpen={isExcelEditorOpen}
        onClose={() => setIsExcelEditorOpen(false)}
        onSuccess={fetchDocuments}
        document={excelDocument}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('documentNumber')}
                >
                  <div className="flex items-center gap-1">
                    Document No
                    {sortConfig?.key === 'documentNumber' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-1">
                    Document Name
                    {sortConfig?.key === 'title' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortConfig?.key === 'type' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortConfig?.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('version')}
                >
                  <div className="flex items-center gap-1">
                    Version
                    {sortConfig?.key === 'version' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('updatedAt')}
                >
                  <div className="flex items-center gap-1">
                    Last Updated
                    {sortConfig?.key === 'updatedAt' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Loading documents...
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-slate-900">No documents found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {doc.documentNumber || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div 
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="cursor-pointer"
                        >
                          <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {doc.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{doc.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize border border-slate-200">
                        {doc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        {doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 font-mono text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        v{doc.version || 0}.0
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" 
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <ActionMenu
                          isOpen={activeMenuDocId === doc.id}
                          onToggle={() => setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id)}
                          onClose={() => setActiveMenuDocId(null)}
                        >
                          <button 
                            onClick={() => {
                              handlePreview(doc);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4 text-slate-400" />
                            Preview
                          </button>
                          {(doc.title.endsWith('.xlsx') || doc.title.endsWith('.xls')) && (
                            <button 
                              onClick={() => {
                                handleExcelEdit(doc);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-green-600" />
                              Edit in Browser
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              navigate(`/documents/${doc.id}`);
                              setActiveMenuDocId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4 text-slate-400" />
                            View Details
                          </button>
                          <button 
                            onClick={() => {
                              handleDownload(doc);
                              setActiveMenuDocId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Download className="w-4 h-4 text-slate-400" />
                            Download File
                          </button>
                          {user?.role === 'admin' && (
                            <button 
                              onClick={() => {
                                handleEdit(doc);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4 text-slate-400" />
                              Edit Document
                            </button>

                          )}
                          {user?.role === 'admin' && (
                            <button 
                              onClick={() => handleDelete(doc)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Document
                            </button>
                          )}
                        </ActionMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <p>Showing {filteredDocuments.length} documents</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-white disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-white disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
