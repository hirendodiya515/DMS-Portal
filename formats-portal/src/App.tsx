import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Printer, 
  Eye, 
  Download, 
  FileText, 
  Building, 
  Calendar,
  X, 
  Loader2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import api from './api';
import { format } from 'date-fns';

interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

interface DocumentData {
  id: string;
  title: string;
  documentNumber: string;
  description: string;
  type: string;
  departments: string[];
  status: string;
  updatedAt: string;
  version?: number;
  versions: DocumentVersion[];
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(() => localStorage.getItem('formats_selected_dept') || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<DocumentData | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [groupByDept, setGroupByDept] = useState<boolean>(true);
  
  // Track recently accessed document IDs
  const [recentDocIds, setRecentDocIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('formats_recent_docs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [deptRes, docsRes] = await Promise.all([
        api.get('/settings/public/departments'),
        api.get('/documents/public/formats')
      ]);
      setDepartments(deptRes.data || []);
      setDocuments(docsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Failed to connect to the DMS server. Please make sure the backend is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter departments to only those having at least one format in our loaded documents
  const activeDepartments = departments.filter(dept => 
    documents.some(doc => 
      doc.departments && doc.departments.some(d => d.trim().toLowerCase() === dept.trim().toLowerCase())
    )
  );

  // Filter documents based on search and selected department (if not grouping)
  const getFilteredDocs = () => {
    return documents.filter(doc => {
      const matchesSearch = 
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.documentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = 
        selectedDept === 'all' || 
        (doc.departments && doc.departments.some(d => d.trim().toLowerCase() === selectedDept.trim().toLowerCase()));
      
      return matchesSearch && matchesDept;
    });
  };

  // Group filtered documents by department
  const getGroupedDocs = () => {
    const filtered = getFilteredDocs();
    const grouped: Record<string, DocumentData[]> = {};

    // Initialize active departments or only selected one
    const deptsToInclude = selectedDept === 'all' ? activeDepartments : [selectedDept];
    
    deptsToInclude.forEach(dept => {
      grouped[dept] = [];
    });
    grouped['Unassigned/Other'] = [];

    filtered.forEach(doc => {
      if (doc.departments && doc.departments.length > 0) {
        doc.departments.forEach(rawDept => {
          const dept = rawDept.trim();
          // Find matching department in our list (case-insensitive)
          const matchedDept = activeDepartments.find(d => d.toLowerCase() === dept.toLowerCase()) || dept;
          
          // If we are filtering by a specific department and this isn't it, skip
          if (selectedDept !== 'all' && selectedDept.toLowerCase() !== dept.toLowerCase()) {
            return;
          }

          if (!grouped[matchedDept]) {
            grouped[matchedDept] = [];
          }
          grouped[matchedDept].push(doc);
        });
      } else {
        if (selectedDept === 'all') {
          grouped['Unassigned/Other'].push(doc);
        }
      }
    });

    // Remove empty groups unless it's the selected department
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0 && key !== selectedDept) {
        delete grouped[key];
      }
    });

    return grouped;
  };

  const getLatestVersion = (doc: DocumentData): DocumentVersion | null => {
    if (!doc.versions || doc.versions.length === 0) return null;
    return doc.versions[0]; // Ordered by versionNumber DESC in API query
  };

  // Helper to add document ID to recently accessed list in localStorage
  const addToRecent = (docId: string) => {
    setRecentDocIds(prev => {
      const updated = [docId, ...prev.filter(id => id !== docId)].slice(0, 4);
      localStorage.setItem('formats_recent_docs', JSON.stringify(updated));
      return updated;
    });
  };

  // Department Selection Handler
  const handleSelectDept = (dept: string) => {
    setSelectedDept(dept);
    localStorage.setItem('formats_selected_dept', dept);
  };

  const handlePrint = async (doc: DocumentData) => {
    const version = getLatestVersion(doc);
    if (!version) return;

    setPrintingId(doc.id);
    addToRecent(doc.id);
    const previewUrl = `${api.defaults.baseURL}/files/public/${version.id}/preview`;

    try {
      // Fetch file data as a blob first to bypass CORS iframe printing issues
      const response = await api.get(`/files/public/${version.id}/preview`, { 
        responseType: 'blob' 
      });
      
      const contentType = response.headers['content-type'];
      const mimeType = typeof contentType === 'string' ? contentType : 'application/pdf';
      const blob = new Blob([response.data], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (!iframeRef.current) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        iframeRef.current = iframe;
      }

      iframeRef.current.src = blobUrl;
      iframeRef.current.onload = () => {
        try {
          setTimeout(() => {
            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.focus();
              iframeRef.current.contentWindow.print();
            }
            setPrintingId(null);
            // Cleanup the blob URL
            URL.revokeObjectURL(blobUrl);
          }, 800);
        } catch (err) {
          console.error('Inner printing failed, falling back to new tab:', err);
          setPrintingId(null);
          URL.revokeObjectURL(blobUrl);
          window.open(previewUrl, '_blank');
        }
      };
    } catch (err) {
      console.error('Failed to load file blob for printing, falling back to new tab:', err);
      setPrintingId(null);
      window.open(previewUrl, '_blank');
    }
  };

  const handleDownload = (doc: DocumentData) => {
    const version = getLatestVersion(doc);
    if (!version) return;
    addToRecent(doc.id);
    const downloadUrl = `${api.defaults.baseURL}/files/public/${version.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  const handlePreview = (doc: DocumentData) => {
    setPreviewDoc(doc);
    addToRecent(doc.id);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0"><FileText className="w-5 h-5" /></div>;
    } else if (ext === 'xlsx' || ext === 'xls') {
      return <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0"><FileText className="w-5 h-5" /></div>;
    } else if (ext === 'docx' || ext === 'doc') {
      return <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0"><FileText className="w-5 h-5" /></div>;
    }
    return <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0"><FileText className="w-5 h-5" /></div>;
  };

  const getFileBadge = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
    const baseClass = "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 self-start mt-0.5";
    if (ext === 'PDF') return `${baseClass} bg-rose-100 text-rose-800`;
    if (ext === 'XLSX' || ext === 'XLS') return `${baseClass} bg-emerald-100 text-emerald-800`;
    if (ext === 'DOCX' || ext === 'DOC') return `${baseClass} bg-blue-100 text-blue-800`;
    return `${baseClass} bg-slate-100 text-slate-800`;
  };

  const filteredDocs = getFilteredDocs();
  const groupedDocs = getGroupedDocs();

  // Find document objects corresponding to recently used IDs
  const recentDocs = recentDocIds
    .map(id => documents.find(d => d.id === id))
    .filter((doc): doc is DocumentData => !!doc);

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Dynamic Dark Branded Corporate Header */}
      <header className="sticky top-0 z-40 w-full bg-brand-500 text-white shadow-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 sm:gap-6">
          
          {/* Logo Section */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="Borosil Logo" className="h-12 object-contain bg-white rounded-lg px-2.5 py-1.5 shadow-sm" />
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white leading-none">BOROSIL</h1>
              <p className="text-[12px] tracking-widest text-slate-300 uppercase font-bold mt-0.5">Formats Portal</p>
            </div>
          </div>
          
          {/* Search Bar - Center Positioned */}
          <div className="relative flex-grow max-w-lg shadow-inner rounded-xl border border-white/10 bg-white/10 focus-within:border-white/30 focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-white/5 transition-all">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
            <input
              type="text"
              placeholder="Search format name, document number, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-transparent border-none rounded-xl focus:outline-none text-white text-sm font-medium placeholder-white/40"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Layout Switch - Integrated into Header */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center bg-black/15 p-0.5 rounded-xl border border-white/5">
              <button
                onClick={() => setGroupByDept(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  groupByDept 
                    ? 'bg-white text-brand-500 shadow-sm' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Grouped
              </button>
              <button
                onClick={() => setGroupByDept(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !groupByDept 
                    ? 'bg-white text-brand-500 shadow-sm' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Clean Sub-header Portal Description */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Standardized Document Formats</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Locate, preview, and print approved and updated formats here.
            </p>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
              ISO 9001 Compliant
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="font-medium text-xs sm:text-sm">{error}</p>
            </div>
            <button 
              onClick={fetchInitialData}
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white font-semibold text-xs rounded-lg hover:bg-rose-700 transition"
            >
              <RefreshCw className="w-3 h-3 animate-spin" /> Retry
            </button>
          </div>
        )}

        {/* Department Filters - Showing only active ones */}
        <div className="mb-6 bg-white/40 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/40 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 px-0.5 scrollbar-thin">
            <button
              onClick={() => handleSelectDept('all')}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                selectedDept === 'all'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200/80'
              }`}
            >
              All Departments ({documents.length})
            </button>
            {activeDepartments.map(dept => {
              const deptDocCount = documents.filter(doc => 
                doc.departments && doc.departments.some(d => d.trim().toLowerCase() === dept.trim().toLowerCase())
              ).length;

              return (
                <button
                  key={dept}
                  onClick={() => handleSelectDept(dept)}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                    selectedDept.toLowerCase() === dept.toLowerCase()
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200/80'
                  }`}
                >
                  {dept} ({deptDocCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Recently Used Formats Section */}
        {recentDocs.length > 0 && (
          <section className="mb-8 bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-brand-500" />
                <h3 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Recently Accessed Formats
                </h3>
              </div>
              <button 
                onClick={() => {
                  setRecentDocIds([]);
                  localStorage.removeItem('formats_recent_docs');
                }}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase transition cursor-pointer"
              >
                Clear History
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentDocs.map(doc => (
                <FormatCard
                  key={`recent-${doc.id}`}
                  doc={doc}
                  latestVersion={getLatestVersion(doc)}
                  getFileIcon={getFileIcon}
                  getFileBadge={getFileBadge}
                  onPrint={handlePrint}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  printingId={printingId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
            <p className="text-slate-400 font-semibold text-xs">Loading formats list...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16 bg-white/60 border border-dashed border-slate-250 rounded-2xl p-6 max-w-xl mx-auto shadow-sm">
            <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 mb-1">No Formats Found</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              We couldn't find any approved formats matching your filters. Ensure files are uploaded in the DMS with document type "Formats" or "Format/record".
            </p>
          </div>
        ) : groupByDept ? (
          /* Grouped Layout: Tighter, smaller card grid (lg:grid-cols-4) */
          <div className="space-y-10">
            {Object.entries(groupedDocs).map(([deptName, docs]) => {
              if (docs.length === 0) return null;
              return (
                <section key={deptName} className="space-y-3">
                  <div className="flex items-center gap-2 pb-0.5 border-b border-slate-200">
                    <Building className="w-4 h-4 text-brand-500" />
                    <h2 className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">
                      {deptName}
                    </h2>
                    <span className="bg-brand-50 text-brand-500 border border-brand-100/40 text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                      {docs.length}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {docs.map(doc => (
                      <FormatCard
                        key={doc.id}
                        doc={doc}
                        latestVersion={getLatestVersion(doc)}
                        getFileIcon={getFileIcon}
                        getFileBadge={getFileBadge}
                        onPrint={handlePrint}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                        printingId={printingId}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          /* List Grid Layout: Tighter, smaller card grid (lg:grid-cols-4) */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocs.map(doc => (
              <FormatCard
                key={doc.id}
                doc={doc}
                latestVersion={getLatestVersion(doc)}
                getFileIcon={getFileIcon}
                getFileBadge={getFileBadge}
                onPrint={handlePrint}
                onPreview={handlePreview}
                onDownload={handleDownload}
                printingId={printingId}
              />
            ))}
          </div>
        )}
      </main>

      {/* Document Preview Modal */}
      {previewDoc && (
        <PreviewModal 
          doc={previewDoc} 
          version={getLatestVersion(previewDoc)} 
          onClose={() => setPreviewDoc(null)}
          onPrint={handlePrint}
          onDownload={handleDownload}
          printingId={printingId}
          baseUrl={api.defaults.baseURL || ''}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-200 mt-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase mb-1">Borosil Renewables Limited</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">
            Part of Digital Document Management System (DMS)
          </p>
          <p className="text-[10px] text-slate-600 max-w-lg mx-auto leading-relaxed">
            This portal hosts compliance-approved, standardized document formats. Any local modifications or use of non-standard file variants is strictly prohibited.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* Document Card Component - Smaller padding and tighter layout */
interface FormatCardProps {
  doc: DocumentData;
  latestVersion: DocumentVersion | null;
  getFileIcon: (name: string) => React.ReactNode;
  getFileBadge: (name: string) => string;
  onPrint: (doc: DocumentData) => void;
  onPreview: (doc: DocumentData) => void;
  onDownload: (doc: DocumentData) => void;
  printingId: string | null;
}

function FormatCard({ 
  doc, 
  latestVersion, 
  getFileIcon, 
  getFileBadge, 
  onPrint, 
  onPreview, 
  onDownload, 
  printingId 
}: FormatCardProps) {
  const isPrinting = printingId === doc.id;

  return (
    <div className="bg-white rounded-xl shadow-premium border border-slate-200 p-4 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      
      {/* Top Border Indicator */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-brand-500/80 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

      <div>
        <div className="flex items-start justify-between gap-2.5 mb-3.5">
          <div className="flex items-start gap-2.5 min-w-0">
            {latestVersion ? getFileIcon(latestVersion.fileName) : getFileIcon('')}
            <div className="min-w-0">
              {/* Document Number */}
              {doc.documentNumber ? (
                <span className="inline-block text-[9px] font-bold text-brand-500 uppercase tracking-wider bg-brand-50 border border-brand-100/50 rounded px-1 py-0.5 mb-1 font-mono">
                  {doc.documentNumber}
                </span>
              ) : (
                <span className="inline-block text-[9px] font-semibold text-slate-400 italic mb-1">
                  No Doc Number
                </span>
              )}
              <h3 className="text-[13px] font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-500 transition-colors truncate-2-lines break-words">
                {doc.title}
              </h3>
            </div>
          </div>
          {latestVersion && (
            <span className={getFileBadge(latestVersion.fileName)}>
              {latestVersion.fileName.split('.').pop()}
            </span>
          )}
        </div>

        {doc.description && (
          <p className="text-[11px] text-slate-500 mb-3.5 line-clamp-2 leading-relaxed">
            {doc.description}
          </p>
        )}
      </div>

      <div className="mt-2.5 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-1 mb-3.5">
          {doc.departments && doc.departments.map(dept => (
            <span key={dept} className="inline-flex items-center text-[9px] font-extrabold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
              {dept.trim()}
            </span>
          ))}
          {latestVersion && (
            <span className="inline-flex items-center text-[9px] font-extrabold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
              v{doc.version || latestVersion.versionNumber}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-3.5">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {format(new Date(doc.updatedAt), 'dd-MMM-yy')}
          </span>
          {latestVersion && (
            <span>
              {(latestVersion.fileSize / 1024).toFixed(0)} KB
            </span>
          )}
        </div>

        {/* Compact Button Bar */}
        <div className="grid grid-cols-3 gap-1.5">
          {latestVersion ? (
            <>
              <button
                onClick={() => onPrint(doc)}
                disabled={isPrinting}
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 cursor-pointer transition shadow-sm disabled:opacity-75"
              >
                {isPrinting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                <span>Print</span>
              </button>

              <button
                onClick={() => onPreview(doc)}
                className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold text-slate-650 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 active:bg-slate-100 cursor-pointer transition"
              >
                <Eye className="w-3.5 h-3.5 text-slate-450" />
                <span>Preview</span>
              </button>

              <button
                onClick={() => onDownload(doc)}
                className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold text-slate-650 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 active:bg-slate-100 cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-450" />
                <span>Get</span>
              </button>
            </>
          ) : (
            <div className="col-span-3 text-center py-1.5 text-[9px] font-bold text-slate-450 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No file uploaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Premium Preview Modal Component */
interface PreviewModalProps {
  doc: DocumentData;
  version: DocumentVersion | null;
  onClose: () => void;
  onPrint: (doc: DocumentData) => void;
  onDownload: (doc: DocumentData) => void;
  printingId: string | null;
  baseUrl: string;
}

function PreviewModal({ 
  doc, 
  version, 
  onClose, 
  onPrint, 
  onDownload, 
  printingId, 
  baseUrl 
}: PreviewModalProps) {
  if (!version) return null;
  
  const fileExt = version.fileName.split('.').pop()?.toLowerCase();
  const isExcel = fileExt === 'xlsx' || fileExt === 'xls';
  
  const previewUrl = `${baseUrl}/files/public/${version.id}/preview`;
  const isPrinting = printingId === doc.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200/60">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {doc.documentNumber && (
                  <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 font-mono">
                    {doc.documentNumber}
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-200 px-1.5 py-0.5 rounded">
                  v{doc.version || version.versionNumber}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 line-clamp-1 mt-0.5">
                {doc.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Modal Actions */}
            <button
              onClick={() => onPrint(doc)}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-75"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>Print</span>
            </button>

            <button
              onClick={() => onDownload(doc)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-650 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-grow bg-slate-100 relative">
          {isExcel ? (
            /* Excel Fallback View */
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-4">
                <FileText className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Excel Sheet Preview Not Supported</h4>
              <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
                Direct browser previewing of spreadsheets (.xlsx) is not supported. Please download the file to open it in Microsoft Excel or Google Sheets.
              </p>
              <button
                onClick={() => onDownload(doc)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/15 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Spreadsheet</span>
              </button>
            </div>
          ) : (
            /* PDF & Word (converted to PDF) Iframe View */
            <iframe
              src={previewUrl}
              className="w-full h-full border-none"
              title="Document Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
