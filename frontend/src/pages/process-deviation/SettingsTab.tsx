import { useState, useEffect } from 'react';
import api from '../../lib/api';

export function SettingsTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [qaHeadId, setQAHeadId] = useState('');
  const [plantHeadId, setPlantHeadId] = useState('');
  const [processHeadId, setProcessHeadId] = useState('');
  const [ceoId, setCeoId] = useState('');
  const [mailAlertDays, setMailAlertDays] = useState('3');
  const [deviationLines, setDeviationLines] = useState('Line 1\nLine 2\nLine 3');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const [qRes, phRes, prRes, ceoRes, aRes, lRes] = await Promise.all([
        api.get('/settings/process_deviation_qa_head'),
        api.get('/settings/process_deviation_plant_head'),
        api.get('/settings/process_deviation_process_head'),
        api.get('/settings/process_deviation_ceo'),
        api.get('/settings/process_deviation_mail_alert_days'),
        api.get('/settings/process_deviation_lines')
      ]);
      
      if (qRes.data) setQAHeadId(qRes.data);
      if (phRes.data) setPlantHeadId(phRes.data);
      if (prRes.data) setProcessHeadId(prRes.data);
      if (ceoRes.data) setCeoId(ceoRes.data);
      if (aRes.data) setMailAlertDays(aRes.data);
      if (lRes.data) setDeviationLines(lRes.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.post('/settings/process_deviation_qa_head', { value: qaHeadId }),
        api.post('/settings/process_deviation_plant_head', { value: plantHeadId }),
        api.post('/settings/process_deviation_process_head', { value: processHeadId }),
        api.post('/settings/process_deviation_ceo', { value: ceoId }),
        api.post('/settings/process_deviation_mail_alert_days', { value: mailAlertDays }),
        api.post('/settings/process_deviation_lines', { value: deviationLines })
      ]);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Process Deviation Settings</h2>
      
      <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Default QA Head</label>
          <select
            value={qaHeadId}
            onChange={(e) => setQAHeadId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">Designated person for QA Head stage (Step 2).</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Default Plant Head</label>
          <select
            value={plantHeadId}
            onChange={(e) => setPlantHeadId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">Designated person for Plant Head stage (Step 3).</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Default Process Head</label>
          <select
            value={processHeadId}
            onChange={(e) => setProcessHeadId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">Designated person for Process Head stage (Step 4).</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Default CEO</label>
          <select
            value={ceoId}
            onChange={(e) => setCeoId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">Designated person for final CEO approval (Step 5).</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Mail Alert Days</label>
          <input
            type="number"
            value={mailAlertDays}
            onChange={(e) => setMailAlertDays(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Process Deviation Lines</label>
          <textarea
            rows={4}
            value={deviationLines}
            onChange={(e) => setDeviationLines(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Line 1&#10;Line 2&#10;Line 3"
          />
          <p className="text-xs text-slate-500 mt-2">Enter available Process Deviation Lines, separated by a newline.</p>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 transition font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
