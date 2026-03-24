import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { SummaryTab } from './SummaryTab';
import { ListTab } from './ListTab';
import { SettingsTab } from './SettingsTab';
import { FileWarning, Settings, List, BarChart2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function ProductDeviationPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'summary' | 'list' | 'settings'>(id ? 'list' : 'summary');
  const { user } = useAuthStore();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileWarning className="w-6 h-6 text-orange-500" />
          Product Deviation
        </h1>
        <p className="text-gray-500 mt-1">Manage product deviations, action plans, and approvals</p>
      </div>

      <div className="bg-white rounded-lg shadow min-h-[500px]">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'summary'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'list'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
              Deviation List
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'summary' && <SummaryTab />}
          {activeTab === 'list' && <ListTab />}
          {activeTab === 'settings' && user?.role === 'admin' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}
