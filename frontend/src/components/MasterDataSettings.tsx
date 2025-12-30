import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../lib/api';

export default function MasterDataSettings() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [uomList, setUomList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState('');
  const [newType, setNewType] = useState('');
  const [newUom, setNewUom] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [deptRes, typeRes, uomRes] = await Promise.all([
        api.get('/settings/departments'),
        api.get('/settings/document_types'),
        api.get('/settings/uom_list')
      ]);
      setDepartments(deptRes.data || []);
      setDocTypes(typeRes.data || []);
      setUomList(uomRes.data || ['Number', 'Percentage', 'Currency', 'Days', 'Count', 'Rating']);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      // Fallback defaults
      setDepartments(['HR', 'IT', 'Finance', 'Operations', 'Quality']);
      setDocTypes(['Policy', 'Procedure', 'Work Instruction', 'Form', 'Record']);
      setUomList(['Number', 'Percentage', 'Currency', 'Days', 'Count', 'Rating']);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string[]) => {
    try {
      await api.post(`/settings/${key}`, { value });
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      alert('Failed to save changes');
    }
  };

  const addDepartment = () => {
    if (!newDept.trim()) return;
    const updated = [...departments, newDept.trim()];
    setDepartments(updated);
    saveSetting('departments', updated);
    setNewDept('');
  };

  const removeDepartment = (dept: string) => {
    const updated = departments.filter(d => d !== dept);
    setDepartments(updated);
    saveSetting('departments', updated);
  };

  const addDocType = () => {
    if (!newType.trim()) return;
    const updated = [...docTypes, newType.trim()];
    setDocTypes(updated);
    saveSetting('document_types', updated);
    setNewType('');
  };

  const removeDocType = (type: string) => {
    const updated = docTypes.filter(t => t !== type);
    setDocTypes(updated);
    saveSetting('document_types', updated);
  };

  const addUom = () => {
    if (!newUom.trim()) return;
    const updated = [...uomList, newUom.trim()];
    setUomList(updated);
    saveSetting('uom_list', updated);
    setNewUom('');
  };

  const removeUom = (uom: string) => {
    const updated = uomList.filter(u => u !== uom);
    setUomList(updated);
    saveSetting('uom_list', updated);
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Departments Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Departments</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="New Department"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
          />
          <button
            onClick={addDepartment}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200 max-h-64 overflow-y-auto">
          {departments.map((dept) => (
            <div key={dept} className="px-4 py-3 flex items-center justify-between group">
              <span className="text-sm text-slate-700">{dept}</span>
              <button
                onClick={() => removeDepartment(dept)}
                className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {departments.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 italic">No departments added</div>
          )}
        </div>
      </div>

      {/* Document Types Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Document Types</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="New Document Type"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && addDocType()}
          />
          <button
            onClick={addDocType}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200 max-h-64 overflow-y-auto">
          {docTypes.map((type) => (
            <div key={type} className="px-4 py-3 flex items-center justify-between group">
              <span className="text-sm text-slate-700">{type}</span>
              <button
                onClick={() => removeDocType(type)}
                className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {docTypes.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 italic">No document types added</div>
          )}
        </div>
      </div>

      {/* UOM Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Units of Measure (UOM)</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newUom}
            onChange={(e) => setNewUom(e.target.value)}
            placeholder="New Unit (e.g., Kg, Hours)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && addUom()}
          />
          <button
            onClick={addUom}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200 max-h-64 overflow-y-auto">
          {uomList.map((uom) => (
            <div key={uom} className="px-4 py-3 flex items-center justify-between group">
              <span className="text-sm text-slate-700">{uom}</span>
              <button
                onClick={() => removeUom(uom)}
                className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {uomList.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 italic">No units added</div>
          )}
        </div>
      </div>
    </div>
  );
}
