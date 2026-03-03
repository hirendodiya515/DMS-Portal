import { useState, useMemo } from 'react';
import { Target, Search, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Measurement {
  id: string;
  actualValue: number;
  measurementDate: string;
  remarks?: string;
}

interface Objective {
  id: string;
  objectiveNumber: string;
  name: string;
  description: string;
  type: 'quality' | 'environmental' | 'safety';
  department: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  uom: string;
  frequency: string;
  target: number;
  higherIsBetter: boolean;
  owner?: { firstName: string; lastName: string };
  measurements: Measurement[];
  latestValue?: number | null;
  progress?: number;
  progressStatus?: string;
  createdAt: string;
}

// Generate an array of objects representing the current financial year (April-March)
function getFinancialYearMonths(): { monthStr: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12; // Start from April (3)
    const year = monthIndex < 3 ? fyStartYear + 1 : fyStartYear;
    const date = new Date(year, monthIndex, 1);
    months.push({
      monthStr: format(date, 'yyyy-MM'),
      label: format(date, 'MMM yy'),
    });
  }
  return months;
}

export function ObjectivesTracking({
  objectives,
  loading,
  departments,
  onViewDetails,
}: {
  objectives: Objective[];
  loading: boolean;
  departments: string[];
  onViewDetails: (obj: Objective) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  
  const fyMonths = useMemo(() => getFinancialYearMonths(), []);

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
      // Note: If multiple readings exist for a month, you could avg or take latest.
      // Here we take average (or could just grab the first/last):
      const val = vals && vals.length > 0 
        ? vals.reduce((a, b) => a + b, 0) / vals.length 
        : null;
      return val;
    });
  };

  const calculateYTD = (monthlyValues: (number | null)[]) => {
      const validValues = monthlyValues.filter(v => v !== null) as number[];
      if (validValues.length === 0) return null;
      
      // Depending on the KPI, YTD could be an average, a sum, or the latest value.
      // For general tracking, an average of the actuals recorded so far is a safe default,
      // but you may want to customize this based on objective.frequency or type.
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
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="quality">QMS</option>
          <option value="environmental">EMS</option>
          <option value="safety">OHSMS</option>
        </select>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
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
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No objectives found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase sticky left-0 bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Objective Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Target
                </th>
                {fyMonths.map(m => (
                  <th key={m.monthStr} className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase min-w-[80px]">
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
                      <div className="font-medium text-slate-900 line-clamp-2 max-w-[250px]" title={objective.name}>
                        {objective.name}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700 whitespace-nowrap">
                        {objective.owner ? `${objective.owner.firstName} ${objective.owner.lastName}` : 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {objective.target} <span className="text-xs font-normal text-slate-500">{objective.uom}</span>
                      </div>
                    </td>
                    {monthlyValues.map((val, idx) => {
                      const isGood = val !== null && (objective.higherIsBetter ? val >= objective.target : val <= objective.target);
                      return (
                        <td key={idx} className="px-3 py-4 text-center">
                           <span className={`text-sm font-medium ${val === null ? 'text-slate-300' : isGood ? 'text-emerald-700' : 'text-red-600'}`}>
                             {val !== null ? typeof val === 'number' ? Number.isInteger(val) ? val : val.toFixed(1) : val : '-'}
                           </span>
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
