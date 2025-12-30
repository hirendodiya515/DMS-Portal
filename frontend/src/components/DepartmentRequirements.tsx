import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface DepartmentRequirement {
  department: string;
  sops: number;
  formats: number;
}

export default function DepartmentRequirements() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<Record<string, DepartmentRequirement>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptRes, reqRes] = await Promise.all([
        api.get('/settings/departments'),
        api.get('/settings/department_requirements').catch(() => ({ data: {} })), // Handle 404 if not set yet
      ]);

      const depts = deptRes.data || [];
      setDepartments(depts);

      // Initialize requirements for all departments
      const currentReqs = reqRes.data || {}; // Backend returns the raw value object directly
      const initialized: Record<string, DepartmentRequirement> = {};
      
      depts.forEach((d: string) => {
        initialized[d] = currentReqs[d] || { department: d, sops: 0, formats: 0 };
      });

      setRequirements(initialized);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load departments or settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequirementChange = (dept: string, field: 'sops' | 'formats', value: string) => {
    const numValue = parseInt(value) || 0;
    setRequirements(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        [field]: numValue
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Backend expects { value: ... } structure for settings update
      await api.post('/settings/department_requirements', { value: requirements });
      alert('Requirements saved successfully!');
    } catch (err) {
      console.error('Failed to save requirements:', err);
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
          <h2 className="text-lg font-semibold text-slate-800">Document Requirements</h2>
          <p className="text-sm text-slate-500">Define the required number of SOPs/WIs and Formats for each department.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {departments.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          No departments found. Please add departments in Master Data first.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-1/3">Department</th>
                <th className="px-6 py-4 w-1/3">Required SOPs / WIs</th>
                <th className="px-6 py-4 w-1/3">Required Formats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((dept) => (
                <tr key={dept} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-800">{dept}</td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="0"
                      value={requirements[dept]?.sops || 0}
                      onChange={(e) => handleRequirementChange(dept, 'sops', e.target.value)}
                      className="w-full max-w-[120px] px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                     <input
                      type="number"
                      min="0"
                      value={requirements[dept]?.formats || 0}
                      onChange={(e) => handleRequirementChange(dept, 'formats', e.target.value)}
                      className="w-full max-w-[120px] px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
