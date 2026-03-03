import { useState, useEffect } from 'react';
import { auditLogsApi } from '../../lib/api';
import { Target } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  details: string;
  timestamp: string;
  objectiveId?: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

export function ObjectivesLogs({ 
  departments,
  objectives
}: { 
  departments: string[];
  objectives: any[];
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await auditLogsApi.getAll({ section: 'objectives' });
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error fetching objective logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Create a map of objectiveId -> department for quickly looking up the department of a log
  const objDeptMap = new Map<string, string>();
  objectives.forEach(obj => {
    objDeptMap.set(obj.id, obj.department || 'Unassigned');
  });

  const filteredLogs = logs.filter(log => {
    if (filterDepartment === 'all') return true;
    const dept = log.objectiveId ? objDeptMap.get(log.objectiveId) : null;
    return dept === filterDepartment;
  });

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600">No activity logs found</h3>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Objectives Activity Log</h2>
          <p className="text-sm text-slate-500 mt-1">Recent updates, edits, and measurements added.</p>
        </div>
        <div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                  No activity logs match the selected filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      log.action.toLowerCase().includes('create') ? 'bg-emerald-100 text-emerald-800' :
                      log.action.toLowerCase().includes('delete') ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    } capitalize`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
