
import { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  LayoutList, 
  LayoutGrid, 
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

interface Document {
  id: string;
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

export default function DepartmentPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'category'>('category');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      const docs: Document[] = response.data;
      setDocuments(docs);
      
      // Extract unique departments
      const depts = new Set<string>();
      docs.forEach(doc => {
        if (doc.departments) {
          doc.departments.forEach(d => depts.add(d));
        }
      });
      setAvailableDepartments(Array.from(depts).sort());
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredDocuments = selectedDept 
    ? documents.filter(doc => doc.departments && doc.departments.includes(selectedDept))
    : [];

  const documentsByType = filteredDocuments.reduce((acc, doc) => {
    const type = doc.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Collapse all categories by default when department changes
  useEffect(() => {
    if (selectedDept && viewMode === 'category') {
      const types = new Set<string>();
      filteredDocuments.forEach(doc => {
        types.add(doc.type || 'other');
      });
      setCollapsedCategories(types);
    }
  }, [selectedDept, viewMode]);

  const toggleCategory = (type: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const renderDocumentRow = (doc: Document) => (
    <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
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
            onClick={() => {
              setPreviewDocument(doc);
              setIsPreviewModalOpen(true);
            }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" 
            title="Preview"
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
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Department Documents</h1>
          <p className="text-slate-500 mt-1">View documents by department</p>
        </div>
      </div>

       <DocumentPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          document={previewDocument}
        />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
        {loading ? (
             <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             </div>
        ) : (
        <>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="w-full sm:w-64">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Department</label>
                <select 
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">-- Select Department --</option>
                    {availableDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
            </div>

            {selectedDept && (
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        title="List View"
                    >
                        <LayoutList className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('category')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'category' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Category View"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>

        {!selectedDept ? (
             <div className="text-center py-12 text-slate-500 border-t border-slate-100">
                <Filter className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>Please select a department to view documents</p>
             </div>
        ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border-t border-slate-100">
                <Search className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>No documents found for this department</p>
            </div>
        ) : (
            <>
                {viewMode === 'list' ? (
                     <div className="overflow-x-auto border rounded-lg border-slate-200">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                         <tr>
                           <th className="px-6 py-4">Document Name</th>
                           <th className="px-6 py-4">Type</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4">Version</th>
                           <th className="px-6 py-4">Last Updated</th>
                           <th className="px-6 py-4 text-right">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200">
                         {filteredDocuments.map(renderDocumentRow)}
                       </tbody>
                     </table>
                   </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(documentsByType).map(([type, docs]) => {
                            const isCollapsed = collapsedCategories.has(type);
                            return (
                            <div key={type} className="border rounded-lg border-slate-200 overflow-hidden">
                                <div 
                                    onClick={() => toggleCategory(type)}
                                    className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-medium text-slate-700 capitalize flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    {isCollapsed ? (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    ) : (
                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                    )}
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    {type.replace('_', ' ')}
                                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full ml-auto">{docs.length}</span>
                                </div>
                                {!isCollapsed && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3 w-1/3">Document Name</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3">Version</th>
                                                <th className="px-6 py-3">Last Updated</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {docs.map(doc => (
                                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-3">
                                                        <div 
                                                            onClick={() => navigate(`/documents/${doc.id}`)}
                                                            className="cursor-pointer font-medium text-slate-900 group-hover:text-blue-600 transition-colors"
                                                        >
                                                            {doc.title}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusColor(doc.status)}`}>
                                                            {getStatusIcon(doc.status)}
                                                            {doc.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="text-slate-600 font-mono text-xs">v{doc.version}.0</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-500">
                                                        {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => {
                                                                    setPreviewDocument(doc);
                                                                    setIsPreviewModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                                                                title="Preview"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDownload(doc)}
                                                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" 
                                                                title="Download"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                )}
                            </div>
                        )})}
                    </div>
                )}
            </>
        )}
        </>
      )}
      </div>
    </div>
  );
}
