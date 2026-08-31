import { useState, useMemo } from 'react';
import { Target, Search, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Objective, Measurement } from '../../types/objective';

const MONTH_KEYS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

// Generate array of 12 months for selected financial year
function getFYMonths(selectedFY?: string): { monthStr: string; label: string; monthKey: string }[] {
  let fyStartYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  if (currentMonth < 3) fyStartYear = fyStartYear - 1;

  if (selectedFY && selectedFY !== 'all') {
    const cleanStr = selectedFY.replace('FY ', '');
    const parts = cleanStr.split('-');
    if (parts[0] && !isNaN(parseInt(parts[0], 10))) {
      fyStartYear = parseInt(parts[0], 10);
    }
  }

  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12; // April is index 3
    const year = monthIndex < 3 ? fyStartYear + 1 : fyStartYear;
    const date = new Date(year, monthIndex, 1);
    months.push({
      monthStr: format(date, 'yyyy-MM'),
      label: format(date, 'MMM yy'),
      monthKey: MONTH_KEYS[i],
    });
  }
  return months;
}

export function ObjectivesTracking({
  objectives,
  loading,
  departments,
  selectedFY,
  onViewDetails,
}: {
  objectives: Objective[];
  loading: boolean;
  departments: string[];
  selectedFY?: string;
  onViewDetails: (obj: Objective) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  
  const fyMonths = useMemo(() => getFYMonths(selectedFY), [selectedFY]);

  // Filter objectives based on search, type, and department
  const filteredObjectives = useMemo(() => {
    return objectives.filter((obj) => {
      const matchesSearch = 
        obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obj.objectiveNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || obj.type === filterType;
      const matchesDept = filterDepartment === 'all' || obj.department === filterDepartment;
      return matchesSearch && matchesType && matchesDept;
    });
  }, [objectives, searchTerm, filterType, filterDepartment]);

  // Map measurements to FY months for a single objective
  const getMonthlyData = (measurements: Measurement[] = []) => {
    const measurementsByMonth: Record<string, number[]> = {};
    
    measurements.forEach((m) => {
      const monthKey = format(parseISO(m.measurementDate), 'yyyy-MM');
      if (!measurementsByMonth[monthKey]) measurementsByMonth[monthKey] = [];
      measurementsByMonth[monthKey].push(Number(m.actualValue));
    });

    return fyMonths.map((m) => {
      const vals = measurementsByMonth[m.monthStr];
      const val = vals && vals.length > 0 
        ? vals.reduce((a, b) => a + b, 0) / vals.length 
        : null;
      return val;
    });
  };

  // Get specific monthly target with cascading fallback
  const getTargetForMonthIndex = (obj: Objective, monthIndex: number): number => {
    const monthKey = MONTH_KEYS[monthIndex];
    if (obj.monthlyTargets && obj.monthlyTargets[monthKey] !== undefined && obj.monthlyTargets[monthKey] !== null) {
      return Number(obj.monthlyTargets[monthKey]);
    }
    // Check earlier months
    for (let i = monthIndex - 1; i >= 0; i--) {
      const prevKey = MONTH_KEYS[i];
      if (obj.monthlyTargets && obj.monthlyTargets[prevKey] !== undefined && obj.monthlyTargets[prevKey] !== null) {
        return Number(obj.monthlyTargets[prevKey]);
      }
    }
    return Number(obj.target || 0);
  };

  const calculateYTD = (monthlyValues: (number | null)[]) => {
      const validValues = monthlyValues.filter(v => v !== null) as number[];
      if (validValues.length === 0) return null;
      return validValues.reduce((a, b) => a + b, 0) / validValues.length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search objectives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          <option value="all">All Types</option>
          <option value="quality">QMS</option>
          <option value="environmental">EMS</option>
          <option value="safety">OHSMS</option>
        </select>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Tracking Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredObjectives.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No objectives found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[1250px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase sticky left-0 bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Objective Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Base Target
                </th>
                {fyMonths.map(m => (
                  <th key={m.monthStr} className="px-2 py-3 text-center text-xs font-semibold text-slate-600 uppercase min-w-[90px]">
                    {m.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase bg-blue-50/50">
                  YTD Avg
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase sticky right-0 bg-slate-50 z-10 border-l border-slate-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredObjectives.map((objective) => {
                const monthlyValues = getMonthlyData(objective.measurements);
                const ytdValue = calculateYTD(monthlyValues);
                
                return (
                  <tr key={objective.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-slate-50/80 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="font-semibold text-slate-900 line-clamp-2 max-w-[240px]" title={objective.name}>
                        {objective.name}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">FY {objective.financialYear || '2026-27'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-700 whitespace-nowrap">
                        {objective.owner ? `${objective.owner.firstName} ${objective.owner.lastName}` : 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                        {objective.target} <span className="text-xs font-normal text-slate-500">{objective.uom}</span>
                      </div>
                    </td>
                    {monthlyValues.map((val, idx) => {
                      const monthTarget = getTargetForMonthIndex(objective, idx);
                      const isGood = val !== null && (objective.higherIsBetter ? val >= monthTarget : val <= monthTarget);
                      return (
                        <td key={idx} className="px-2 py-3 text-center border-r border-slate-100">
                          <div className="flex flex-col items-center">
                            <span className={`text-sm font-bold ${val === null ? 'text-slate-300' : isGood ? 'text-emerald-700' : 'text-red-600'}`}>
                              {val !== null ? (typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : val) : '-'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5" title={`Target for month: ${monthTarget}`}>
                              T: {monthTarget}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-4 py-4 text-center bg-blue-50/30">
                       <span className="text-sm font-bold text-blue-700">
                         {ytdValue !== null ? (Number.isInteger(ytdValue) ? ytdValue : ytdValue.toFixed(1)) : '-'}
                       </span>
                    </td>
                    <td className="px-4 py-4 text-center sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 border-l border-slate-100 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <button
                        onClick={() => onViewDetails(objective)}
                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
