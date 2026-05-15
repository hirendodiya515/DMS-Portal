import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

export default function CategoryVisibilitySettings() {
  const [allDocTypes, setAllDocTypes] = useState<string[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typeRes, visibleRes] = await Promise.all([
        api.get('/settings/document_types'),
        api.get('/settings/visible_document_categories').catch(() => ({ data: [] })),
      ]);

      setAllDocTypes(typeRes.data || []);
      setVisibleCategories(visibleRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setVisibleCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.post('/settings/visible_document_categories', { value: visibleCategories });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Category Visibility</h2>
          <p className="text-sm text-slate-500">Select which document categories should be visible in the Category-Wise View.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-100">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2 text-sm border border-green-100">
          <CheckCircle2 className="w-4 h-4" />
          Settings saved successfully!
        </div>
      )}

      {allDocTypes.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          No document types found. Please add them in Master Data settings first.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allDocTypes.map((type) => (
            <label
              key={type}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${
                visibleCategories.includes(type)
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={visibleCategories.includes(type)}
                  onChange={() => toggleCategory(type)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition-all"
                />
                <svg
                  className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className={`text-sm font-medium capitalize ${
                visibleCategories.includes(type) ? 'text-blue-900' : 'text-slate-700'
              }`}>
                {type}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
