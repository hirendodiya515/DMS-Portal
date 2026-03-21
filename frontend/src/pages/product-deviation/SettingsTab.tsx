import { useState, useEffect } from 'react';
import api from '../../lib/api';

export function SettingsTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [marketingPersonId, setMarketingPersonId] = useState('');
  const [plantHeadId, setPlantHeadId] = useState('');
  const [qualityHeadId, setQualityHeadId] = useState('');
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
      const resMarketing = await api.get('/settings/product_deviation_marketing_person');
      const resPlant = await api.get('/settings/product_deviation_plant_head');
      const resQuality = await api.get('/settings/product_deviation_quality_head');
      const resAlert = await api.get('/settings/product_deviation_mail_alert_days');
      const resLines = await api.get('/settings/product_deviation_lines');
      
      if (resMarketing.data) setMarketingPersonId(resMarketing.data);
      if (resPlant.data) setPlantHeadId(resPlant.data);
      if (resQuality.data) setQualityHeadId(resQuality.data);
      if (resAlert.data) setMailAlertDays(resAlert.data);
      if (resLines.data) setDeviationLines(resLines.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/settings/product_deviation_marketing_person', { value: marketingPersonId });
      await api.post('/settings/product_deviation_plant_head', { value: plantHeadId });
      await api.post('/settings/product_deviation_quality_head', { value: qualityHeadId });
      await api.post('/settings/product_deviation_mail_alert_days', { value: mailAlertDays });
      await api.post('/settings/product_deviation_lines', { value: deviationLines });
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
      <h2 className="text-xl font-bold text-slate-800 mb-6">Deviation Settings</h2>
      
      <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Default Marketing Person</label>
          <select
            value={marketingPersonId}
            onChange={(e) => setMarketingPersonId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">This user will be responsible for providing marketing remarks.</p>
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
          <p className="text-xs text-slate-500 mt-2">This user will approve deviations and forward them to Quality Head.</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Default Quality Head</label>
          <select
            value={qualityHeadId}
            onChange={(e) => setQualityHeadId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">This user will provide final approval to close the deviation.</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Mail Alert Days</label>
          <input
            type="number"
            value={mailAlertDays}
            onChange={(e) => setMailAlertDays(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-2">Number of days before an escalation alert is sent for pending tasks.</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Deviation Lines</label>
          <textarea
            rows={4}
            value={deviationLines}
            onChange={(e) => setDeviationLines(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Line 1&#10;Line 2&#10;Line 3"
          />
          <p className="text-xs text-slate-500 mt-2">Enter available Product Deviation Lines, separated by a newline.</p>
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
