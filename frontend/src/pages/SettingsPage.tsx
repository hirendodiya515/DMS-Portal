import { useState } from 'react';
import { Users, Database, FileText, LayoutGrid, Sparkles, RefreshCw } from 'lucide-react';
import UsersPage from './UsersPage';
import MasterDataSettings from '../components/MasterDataSettings';
import DepartmentRequirements from '../components/DepartmentRequirements';
import CategoryVisibilitySettings from '../components/CategoryVisibilitySettings';
import api from '../lib/api';

function AiSettings() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; filesProcessed: number; totalChunks: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReindex = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.post('/ai/reindex');
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to rebuild AI index. Ensure the backend is running and Ollama embedding model is pulled.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">AI Copilot Knowledge Base</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Scans, parses, and indexes all <strong>approved documents</strong> (<code>.pdf</code>, <code>.docx</code>, <code>.txt</code>, <code>.md</code>) uploaded to the DMS portal.
              Click the button below to rebuild the vector index. Obsolete or deleted versions will be automatically pruned.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleReindex}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg transition font-medium text-sm shadow-md"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Indexing Files...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Rebuild Vector Index
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-sm space-y-1">
          <p className="font-semibold">✓ Indexing completed successfully!</p>
          <p className="text-xs text-emerald-700 font-mono">
            Files Processed: {result.filesProcessed} | Total Chunks Created: {result.totalChunks}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-sm">
          <p className="font-semibold">⚠️ Indexing failed</p>
          <p className="text-xs text-rose-700 mt-1 font-mono">{error}</p>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1">Manage system configurations and users</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Database className="w-4 h-4" />
              Master Data
            </button>
            <button
              onClick={() => setActiveTab('requirements')}
              className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'requirements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Doc Requirements
            </button>
            <button
              onClick={() => setActiveTab('visibility')}
              className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'visibility'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Category Visibility
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ai'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Copilot
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && <MasterDataSettings />}
          {activeTab === 'requirements' && <DepartmentRequirements />}
          {activeTab === 'visibility' && <CategoryVisibilitySettings />}
          {activeTab === 'users' && <UsersPage embedded />}
          {activeTab === 'ai' && <AiSettings />}
        </div>
      </div>
    </div>
  );
}
