import { useState, useEffect } from 'react';
import { Users, Shield, Save, X, Search, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  role: string;
}

export default function CompetencySettings() {
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user directory
      const usersRes = await api.get('/users');
      setAllUsers(usersRes.data || []);

      // Fetch active competency admins
      const settingsRes = await api.get('/settings/competency_admins');
      if (settingsRes.data && Array.isArray(settingsRes.data)) {
        setSelectedAdmins(settingsRes.data);
      }
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleAdmin = (userId: string) => {
    if (selectedAdmins.includes(userId)) {
      setSelectedAdmins(selectedAdmins.filter(id => id !== userId));
    } else {
      if (selectedAdmins.length >= 3) {
        showToast('Maximum 3 HR Admins allowed', 'error');
        return;
      }
      setSelectedAdmins([...selectedAdmins, userId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/settings/competency_admins', { value: selectedAdmins });
      showToast('HR Admin overrides saved successfully!');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    `${u.firstName} ${u.lastName} ${u.email} ${u.department}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Configuration...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl transition-all
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-blue-600" size={24} />
              Competency Module Administrators
            </h2>
            <p className="text-slate-500 text-sm mt-1 max-w-xl">
              Select up to 3 Human Resources personnel to grant "God-Mode" access. These dedicated delegates will possess identical administrative tracking permissions across all Competency & Training pages without requiring system-wide global admin credentials.
            </p>
          </div>
          <button 
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors text-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between">
              Selected Delegates
              <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-bold font-mono">
                {selectedAdmins.length} / 3
              </span>
            </h3>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl min-h-[300px] p-4 flex flex-col gap-3">
              {selectedAdmins.length === 0 ? (
                <div className="text-center py-16 opacity-50 m-auto flex flex-col items-center">
                  <Users size={32} className="mb-3" />
                  <p className="text-sm text-slate-600">No HR Admins defined.</p>
                  <p className="text-xs text-slate-400">Search & select users from the directory.</p>
                </div>
              ) : (
                selectedAdmins.map(adminId => {
                  const user = allUsers.find(u => u.id === adminId);
                  if (!user) return null;
                  return (
                    <div key={adminId} className="bg-white border text-left border-blue-200 shadow-sm p-4 rounded-lg flex items-center justify-between group">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-500 mb-1">{user.email}</p>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {user.department || 'No Dept'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleToggleAdmin(adminId)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        title="Remove Privileges"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Official End-User Directory
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by name, email, or department..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No users found.</div>
              ) : (
                filteredUsers.map(user => {
                  const isSelected = selectedAdmins.includes(user.id);
                  if (user.role === 'admin') return null; // Prevent showing global admins
                  return (
                    <button 
                      key={user.id}
                      onClick={() => handleToggleAdmin(user.id)}
                      disabled={!isSelected && selectedAdmins.length >= 3}
                      className={`w-full p-4 flex text-left items-center justify-between transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed
                        ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{user.department || 'N/A'}</span>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors
                          ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
