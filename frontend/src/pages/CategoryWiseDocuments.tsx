import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Loader2, 
  ChevronRight, 
  Download,
  Eye,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

interface Document {
  id: string;
  title: string;
  documentNumber: string;
  type: string;
  status: string;
  updatedAt: string;
  currentVersionId?: string;
}

export default function CategoryWiseDocuments() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Preview State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docsRes, visibleRes] = await Promise.all([
        api.get('/documents'),
        api.get('/settings/visible_document_categories').catch(() => ({ data: [] })),
      ]);

      setDocuments(docsRes.data || []);
      setVisibleCategories(visibleRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation(); // Prevent navigating to detail page
    setPreviewDocument(doc);
    setIsPreviewModalOpen(true);
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (doc.documentNumber && doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const isVisible = visibleCategories.length === 0 || visibleCategories.includes(doc.type);
    const isApproved = doc.status === 'approved';
    return matchesSearch && isVisible && isApproved;
  });

  // Group by category
  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    const category = doc.type || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedDocs).sort();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-400 animate-pulse text-sm font-medium">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Category View</h1>
          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            Showing approved documents organized by category
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs shadow-sm"
            />
          </div>
          
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={previewDocument}
      />

      {sortedCategories.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No approved documents</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Only documents with "Approved" status are shown here. 
            {user?.role === 'admin' && " Check visibility settings if some categories are missing."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {sortedCategories.map((category) => (
            <section key={category} className="space-y-3 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 bg-blue-600 rounded-full shadow-[0_0_8px_-1px_rgba(37,99,235,0.4)]"></div>
                <h2 className="text-lg font-bold text-slate-800 capitalize tracking-tight flex items-center gap-2">
                  {category}
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {groupedDocs[category].length}
                  </span>
                </h2>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {groupedDocs[category].map((doc) => (
                    <div 
                      key={doc.id}
                      className="group bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer flex flex-col h-full relative"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 leading-tight">
                            {doc.title}
                          </h4>
                          {doc.documentNumber && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase tracking-wider truncate">
                              {doc.documentNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-medium text-slate-400 uppercase">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={(e) => handlePreview(e, doc)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Preview Document"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <tr>
                          <th className="px-4 py-2">Document</th>
                          <th className="px-4 py-2">Number</th>
                          <th className="px-4 py-2">Updated</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupedDocs[category].map((doc) => (
                          <tr 
                            key={doc.id} 
                            className="group hover:bg-blue-50/20 transition-colors cursor-pointer"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                          >
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {doc.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-[10px] font-mono text-slate-500 uppercase">
                              {doc.documentNumber || '-'}
                            </td>
                            <td className="px-4 py-2 text-[10px] text-slate-500">
                              {new Date(doc.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => handlePreview(e, doc)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                  title="Preview"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-all">
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
