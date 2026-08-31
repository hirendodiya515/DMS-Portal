import React from 'react';
import { ArrowLeft, Edit, Trash2, Plus, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatTypeLabel } from './ObjectivesList';
import type { Objective, Measurement } from '../../types/objective';

const MONTH_KEYS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

function getFinancialYearMonths(fyStr?: string): { month: string; label: string; monthKey: string }[] {
  let fyStartYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  if (currentMonth < 3) fyStartYear = fyStartYear - 1;

  if (fyStr) {
    const cleanStr = fyStr.replace('FY ', '');
    const parts = cleanStr.split('-');
    if (parts[0] && !isNaN(parseInt(parts[0], 10))) {
      fyStartYear = parseInt(parts[0], 10);
    }
  }

  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12;
    const year = monthIndex < 3 ? fyStartYear + 1 : fyStartYear;
    const date = new Date(year, monthIndex, 1);
    months.push({
      month: format(date, 'yyyy-MM'),
      label: format(date, 'MMM'),
      monthKey: MONTH_KEYS[i],
    });
  }
  return months;
}

function getTargetForMonthIndex(objTarget: number, monthlyTargets?: Record<string, number>, monthIndex?: number): number {
  if (monthIndex === undefined || monthIndex === null) return Number(objTarget || 0);
  const monthKey = MONTH_KEYS[monthIndex];
  if (monthlyTargets && monthlyTargets[monthKey] !== undefined && monthlyTargets[monthKey] !== null) {
    return Number(monthlyTargets[monthKey]);
  }
  for (let i = monthIndex - 1; i >= 0; i--) {
    const prevKey = MONTH_KEYS[i];
    if (monthlyTargets && monthlyTargets[prevKey] !== undefined && monthlyTargets[prevKey] !== null) {
      return Number(monthlyTargets[prevKey]);
    }
  }
  return Number(objTarget || 0);
}

function prepareChartData(
  measurements: Measurement[], 
  target: number, 
  financialYear?: string,
  monthlyTargets?: Record<string, number>,
  subTargets?: { id: string; name: string; target?: number }[]
) {
  const fyMonths = getFinancialYearMonths(financialYear);
  const measurementsByMonth: { [key: string]: Measurement[] } = {};
  
  measurements.forEach((m) => {
    const monthKey = format(parseISO(m.measurementDate), 'yyyy-MM');
    if (!measurementsByMonth[monthKey]) {
      measurementsByMonth[monthKey] = [];
    }
    measurementsByMonth[monthKey].push(m);
  });
  
  return fyMonths.map((mInfo, idx) => {
    const monthMeasurements = measurementsByMonth[mInfo.month] || [];
    const avgValue = monthMeasurements.length > 0 
      ? monthMeasurements.reduce((acc, m) => acc + Number(m.actualValue), 0) / monthMeasurements.length 
      : null;
      
    const sortedMeasurements = [...monthMeasurements].sort((a, b) => 
      new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
    const latestMeasurement = sortedMeasurements[0];

    const subChartData: Record<string, number | null> = {};
    const latestSubValuesRecord: Record<string, number | null> = {};
    if (subTargets && subTargets.length > 0) {
      subTargets.forEach(st => {
        const stVals = monthMeasurements
          .map(m => m.subValues?.find(sv => sv.subTargetId === st.id)?.value)
          .filter(v => typeof v === 'number') as number[];
          
        subChartData[`st_${st.id}`] = stVals.length > 0 ? stVals.reduce((a, b) => a + b, 0) / stVals.length : null;
        
        const latestStVal = latestMeasurement?.subValues?.find(sv => sv.subTargetId === st.id);
        latestSubValuesRecord[st.id] = latestStVal ? Number(latestStVal.value) : null;
      });
    }

    const monthTarget = getTargetForMonthIndex(target, monthlyTargets, idx);

    return {
      monthLabel: mInfo.label,
      fullMonth: mInfo.month,
      value: avgValue,
      target: monthTarget,
      remarks: latestMeasurement?.remarks || '-',
      latestMeasurementObj: latestMeasurement || null,
      ...subChartData,
      latestSubValuesRecord
    };
  });
}

const LINE_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

function getStatusBadge(actual: number | null, target: number, higherIsBetter: boolean) {
  if (actual === null) return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">No Data</span>;
  
  const isGood = higherIsBetter ? actual >= target : actual <= target;
  
  if (isGood) {
    return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">On Track</span>;
  }
  
  const variance = Math.abs((actual - target) / (target || 1));
  if (variance <= 0.1) {
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">At Risk</span>;
  }
  
  return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Behind</span>;
}

export function ObjectiveDetailView({
  objective,
  onBack,
  onEdit,
  onCarryForward,
  onDelete,
  onAddMeasurement,
  onEditMeasurement,
  onDeleteMeasurement,
  user
}: {
  objective: Objective;
  onBack: () => void;
  onEdit: (obj: Objective) => void;
  onCarryForward?: (obj: Objective) => void;
  onDelete: (id: string) => void;
  onAddMeasurement: (obj: Objective) => void;
  onEditMeasurement: (measurement: Measurement, obj: Objective) => void;
  onDeleteMeasurement: (measurementId: string) => void;
  user: any;
}) {
  const chartData = prepareChartData(
    objective.measurements || [], 
    objective.target, 
    objective.financialYear,
    objective.monthlyTargets,
    objective.hasSubTargets ? objective.subTargets : undefined
  );
  
  const isLineWise = objective.hasSubTargets && objective.subTargets && objective.subTargets.length > 0;
  const [expandedMonths, setExpandedMonths] = React.useState<Record<string, boolean>>({});

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  const isSameDepartment = user?.department === objective.department;
  const isAllowedRoleInDept = ['creator', 'reviewer', 'dept_head'].includes(user?.role);
  const canModify = user?.role === 'admin' || (isSameDepartment && isAllowedRoleInDept);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
        
        <div className="flex items-center gap-2">
          {onCarryForward && (
            <button
              onClick={() => onCarryForward(objective)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              Carry Forward
            </button>
          )}

          {canModify && (
            <>
              <button
                onClick={() => onAddMeasurement(objective)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Reading
              </button>
              <button
                onClick={() => onEdit(objective)}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white"
                title="Edit Objective"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(objective.id)}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 bg-white"
                title="Delete Objective"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                FY {objective.financialYear || '2026-27'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 uppercase tracking-wide">
                {objective.department}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 uppercase">
                {formatTypeLabel(objective.type)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{objective.name}</h1>
            <p className="text-slate-600 text-sm max-w-2xl">{objective.description || 'No description provided.'}</p>
            
            <div className="mt-4 flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Owner</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                    {objective.owner ? objective.owner.firstName[0] : '?'}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {objective.owner ? `${objective.owner.firstName} ${objective.owner.lastName}` : 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 bg-slate-50 rounded-lg p-5 border border-slate-100 min-w-[200px]">
            <div className="mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Base Target</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{objective.target}</span>
                <span className="text-sm text-slate-500">{objective.uom}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {objective.higherIsBetter ? '↑ Higher is better' : '↓ Lower is better'}
              </p>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Latest Reading</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-600">
                  {objective.latestValue !== null && objective.latestValue !== undefined ? objective.latestValue : '-'}
                </span>
                {objective.latestValue !== null && <span className="text-sm text-slate-500">{objective.uom}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Performance Trend • FY {objective.financialYear || '2026-27'}</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <ReferenceLine y={objective.target} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Base Target', fill: '#ef4444', fontSize: 12, position: 'right' }} />
              
              {/* Overall Total/Avg Line */}
              <Line 
                type="monotone" 
                dataKey="value" 
                name="Actual Value" 
                stroke="#2563eb" 
                strokeWidth={3} 
                dot={{ fill: '#2563eb', r: 4 }} 
                activeDot={{ r: 6 }} 
              />

              {/* Sub-Target Lines if line-wise detail tracking is enabled */}
              {isLineWise && objective.subTargets!.map((st, idx) => (
                <Line 
                  key={st.id}
                  type="monotone" 
                  dataKey={`st_${st.id}`} 
                  name={st.name} 
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]} 
                  strokeWidth={1.5} 
                  strokeDasharray="4 4"
                  dot={{ r: 2 }} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Monthly breakdown • FY {objective.financialYear || '2026-27'}</h2>
          <span className="text-xs font-semibold text-slate-500 uppercase">Target vs Actual</span>
        </div>
        
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {isLineWise && <th className="w-8 px-2 py-3 text-center"></th>}
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Month</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Monthly Target</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actual Reading</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Remarks</th>
              {canModify && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {chartData.map((row) => {
              const isExpanded = expandedMonths[row.fullMonth];

              return (
                <React.Fragment key={row.fullMonth}>
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    {isLineWise && (
                      <td className="px-2 py-4 text-center">
                        {isLineWise && (
                          <button 
                            onClick={() => toggleMonth(row.fullMonth)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4 font-semibold text-slate-800">{row.monthLabel}</td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">
                      {row.target} <span className="text-slate-400 text-xs">{objective.uom}</span>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-900 text-base">
                      {row.value !== null ? (typeof row.value === 'number' ? row.value.toFixed(2) : row.value) : '-'}
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(row.value, row.target, objective.higherIsBetter)}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{row.remarks}</td>
                    {canModify && (
                      <td className="px-4 py-4 text-right">
                        {row.latestMeasurementObj && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditMeasurement(row.latestMeasurementObj, objective)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                              title="Edit Reading"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteMeasurement(row.latestMeasurementObj.id)}
                              className="p-1 text-red-400 hover:text-red-600 rounded"
                              title="Delete Reading"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>

                  {/* Expanded Sub-Target Rows */}
                  {isLineWise && isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={canModify ? 7 : 6} className="px-6 py-3 border-t border-b border-slate-100">
                        <div className="pl-6 space-y-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase">Sub-Objectives Breakdown for {row.monthLabel}</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {objective.subTargets!.map(st => {
                              const val = row.latestSubValuesRecord[st.id];
                              return (
                                <div key={st.id} className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs">
                                  <span className="text-xs font-medium text-slate-600 block truncate" title={st.name}>{st.name}</span>
                                  <div className="flex items-baseline justify-between mt-1">
                                    <span className="text-xs text-slate-400">Target: {st.target}</span>
                                    <span className="text-sm font-bold text-slate-800">{val !== null ? val : '-'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
