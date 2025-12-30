import { useState } from 'react';
import { Users, Database, FileText } from 'lucide-react';
import UsersPage from './UsersPage';
import MasterDataSettings from '../components/MasterDataSettings';
import DepartmentRequirements from '../components/DepartmentRequirements';

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
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && <MasterDataSettings />}
          {activeTab === 'requirements' && <DepartmentRequirements />}
          {activeTab === 'users' && <UsersPage embedded />}
        </div>
      </div>
    </div>
  );
}
