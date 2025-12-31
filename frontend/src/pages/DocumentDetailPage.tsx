import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  Download, 
  History, 
  User, 
  Calendar,
  Shield,
  Upload
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  createdAt: string;
  uploadedBy: string;
  changeNotes?: string;
  effectiveDate?: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface DocumentDetail {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  departments: string[];
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    firstName: string;
    lastName: string;
  };
  versions: DocumentVersion[];
  auditLogs: AuditLog[];
}

import UploadVersionModal from '../components/UploadVersionModal';
import ActionMenu from '../components/ActionMenu';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [docData, setDocData] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'audit'>('details');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await api.get(`/documents/${id}`);
      setDocData(response.data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'submit' | 'approve' | 'reject') => {
    if (!docData) return;
    try {
      if (action === 'reject') {
        const comments = prompt('Enter rejection reason:');
        if (!comments) return;
        await api.post(`/documents/${docData.id}/reject`, { comments });
      } else if (action === 'approve') {
        await api.post(`/documents/${docData.id}/approve`, {});
      } else {
        await api.post(`/documents/${docData.id}/${action}`);
      }
      fetchDocument();
    } catch (error) {
      console.error(`Failed to ${action} document:`, error);
      alert(`Failed to ${action} document`);
    }
  };

  const handleDownload = async (versionId: string, defaultFileName: string) => {
    try {
      const response = await api.get(`/files/${versionId}/download`, {
        responseType: 'blob',
      });

      // Try to extract filename from Content-Disposition header
      let fileName = defaultFileName;
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="text-center mt-20">
        <h2 className="text-2xl font-bold text-slate-800">Document not found</h2>
        <button onClick={() => navigate('/documents')} className="mt-4 text-blue-600 hover:underline">
          Back to Documents
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <UploadVersionModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchDocument}
        documentId={id!}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/documents')}
            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{docData.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusColor(docData.status)}`}>
                {docData.status.replace('_', ' ')}
              </span>
              <span className="text-sm text-slate-500">v{docData.versions[0]?.versionNumber || 0}.0</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {(docData.status === 'draft' || docData.status === 'rejected' || docData.status === 'approved') && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition shadow-sm font-medium flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {docData.status === 'approved' ? 'Revise Document' : 'Upload New Version'}
            </button>
          )}
          {docData.status === 'draft' && (
            <button 
              onClick={() => handleAction('submit')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
            >
              Submit for Review
            </button>
          )}
          {docData.status === 'under_review' && (user?.role === 'admin' || user?.role === 'reviewer') && (
            <>
              <button 
                onClick={() => handleAction('approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm font-medium"
              >
                Approve
              </button>
              <button 
                onClick={() => handleAction('reject')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm font-medium"
              >
                Reject
              </button>
            </>
          )}
          <ActionMenu
            isOpen={isActionMenuOpen}
            onToggle={() => setIsActionMenuOpen(!isActionMenuOpen)}
            onClose={() => setIsActionMenuOpen(false)}
          >
            <button 
              onClick={() => {
                if (docData.currentVersionId) {
                  handleDownload(docData.currentVersionId, docData.title);
                }
                setIsActionMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Download Current Version
            </button>
            <button 
              onClick={() => {
                navigate('/documents');
                setIsActionMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              Back to Documents
            </button>
          </ActionMenu>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === 'details' ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === 'history' ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Version History
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === 'audit' ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Audit Trail
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
                    <p className="text-slate-800 leading-relaxed">{docData.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Document Type</h3>
                      <div className="flex items-center gap-2 text-slate-800">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="capitalize">{docData.type}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Departments</h3>
                      <div className="flex flex-wrap gap-2">
                        {docData.departments?.map(dept => (
                          <span key={dept} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                            {dept}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {docData.versions.map((version) => (
                    <div key={version.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 text-slate-500 font-bold text-sm">
                          v{version.versionNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">{version.fileName}</p>
                            {version.id !== docData.currentVersionId && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium border border-red-200">
                                OBSOLETED
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 space-y-1 mt-1">
                            <p>Uploaded on {format(new Date(version.createdAt), 'MMM d, yyyy HH:mm')}</p>
                            {version.effectiveDate && (
                                <p className="text-blue-600 font-medium">Effective: {format(new Date(version.effectiveDate), 'MMM d, yyyy')}</p>
                            )}
                            {version.changeNotes && (
                                <p className="italic text-slate-600">"{version.changeNotes}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {(version.id === docData.currentVersionId || user?.role === 'admin') && (
                        <button 
                          onClick={() => handleDownload(version.id, version.fileName)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {docData.auditLogs?.map((log) => (
                    <div key={log.id} className="relative pl-8">
                      <div className="absolute left-0 top-1 w-4 h-4 bg-white border-2 border-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          <span className="capitalize font-bold">{log.action.replace('_', ' ')}</span>
                          <span className="text-slate-500 font-normal"> - {log.details}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <User className="w-3 h-3" />
                          <span>{log.user?.firstName} {log.user?.lastName}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Metadata
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Owner</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {docData.owner?.firstName?.[0]}{docData.owner?.lastName?.[0]}
                  </div>
                  <span className="text-sm text-slate-700">{docData.owner?.firstName} {docData.owner?.lastName}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Created At</p>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {format(new Date(docData.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Last Updated</p>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <History className="w-4 h-4 text-slate-400" />
                  {format(new Date(docData.updatedAt), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
