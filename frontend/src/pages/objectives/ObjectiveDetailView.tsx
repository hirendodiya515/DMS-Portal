import React from 'react';
import { ArrowLeft, Edit, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatTypeLabel } from './ObjectivesList';

interface Measurement {
  id: string;
  actualValue: number;
  measurementDate: string;
  remarks?: string;
  subValues?: { subTargetId: string; value: number }[];
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
  hasSubTargets?: boolean;
  subTargets?: { id: string; name: string; target?: number }[];
}

// Get current financial year months (April to March)
function getFinancialYearMonths(): { month: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12;
    const year = monthIndex < 3 ? fyStartYear + 1 : fyStartYear;
    const date = new Date(year, monthIndex, 1);
    months.push({
      month: format(date, 'yyyy-MM'),
      label: format(date, 'MMM'),
      year,
      monthIndex
    });
  }
  return months;
}

function getFYLabel(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  return `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
}

function prepareChartData(measurements: Measurement[], target: number, subTargets?: { id: string; name: string; target?: number }[]) {
  const fyMonths = getFinancialYearMonths();
  const measurementsByMonth: { [key: string]: Measurement[] } = {};
  
  measurements.forEach((m) => {
    const monthKey = format(parseISO(m.measurementDate), 'yyyy-MM');
    if (!measurementsByMonth[monthKey]) {
      measurementsByMonth[monthKey] = [];
    }
    measurementsByMonth[monthKey].push(m);
  });
  
  return fyMonths.map((mInfo) => {
    const monthMeasurements = measurementsByMonth[mInfo.month] || [];
    const avgValue = monthMeasurements.length > 0 
      ? monthMeasurements.reduce((acc, m) => acc + Number(m.actualValue), 0) / monthMeasurements.length 
      : null;
      
    const sortedMeasurements = [...monthMeasurements].sort((a, b) => 
      new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
    const latestMeasurement = sortedMeasurements[0];

    // Build dynamic sub-values for Recharts
    const subChartData: Record<string, number | null> = {};
    const latestSubValuesRecord: Record<string, number | null> = {};
    if (subTargets && subTargets.length > 0) {
      subTargets.forEach(st => {
        // Average the line values for the month
        const stVals = monthMeasurements
          .map(m => m.subValues?.find(sv => sv.subTargetId === st.id)?.value)
          .filter(v => typeof v === 'number') as number[];
          
        subChartData[`st_${st.id}`] = stVals.length > 0 ? stVals.reduce((a, b) => a + b, 0) / stVals.length : null;
        
        // Latest value for the table
        const latestStVal = latestMeasurement?.subValues?.find(sv => sv.subTargetId === st.id);
        latestSubValuesRecord[st.id] = latestStVal ? Number(latestStVal.value) : null;
      });
    }

    return {
      monthLabel: mInfo.label,
      fullMonth: mInfo.month,
      value: avgValue,
      target,
      remarks: latestMeasurement?.remarks || '-',
      latestMeasurementObj: latestMeasurement || null,
      ...subChartData, // Spread sub-values for line mapping
      latestSubValuesRecord // Keep raw records for the table
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
  
  // Calculate variance percentage
  const variance = Math.abs((actual - target) / target);
  if (variance <= 0.1) {
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">At Risk</span>;
  }
  
  return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Behind</span>;
}

export function ObjectiveDetailView({
  objective,
  onBack,
  onEdit,
  onDelete,
  onAddMeasurement,
  onEditMeasurement,
  onDeleteMeasurement,
  user
}: {
  objective: Objective;
  onBack: () => void;
  onEdit: (obj: Objective) => void;
  onDelete: (id: string) => void;
  onAddMeasurement: (obj: Objective) => void;
  onEditMeasurement: (measurement: Measurement, obj: Objective) => void;
  onDeleteMeasurement: (measurementId: string) => void;
  user: any;
}) {
  const chartData = prepareChartData(objective.measurements || [], objective.target, objective.hasSubTargets ? objective.subTargets : undefined);
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
  
  const canManageMeasurements = ['admin', 'dept_head'].includes(user?.role);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
        
        {canModify && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddMeasurement(objective)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Reading
            </button>
            <button
              onClick={() => onEdit(objective)}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200 bg-white"
              title="Edit Objective"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(objective.id)}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 bg-white"
              title="Delete Objective"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
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
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Target</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{objective.target}</span>
                <span className="text-sm font-medium text-slate-500">{objective.uom}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{objective.higherIsBetter ? 'Higher is better' : 'Lower is better'}</p>
            </div>
            
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Current Value</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-600">
                  {objective.latestValue !== null && objective.latestValue !== undefined ? objective.latestValue : '-'}
                </span>
                <span className="text-sm font-medium text-slate-500">{objective.latestValue !== null && objective.latestValue !== undefined ? objective.uom : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Monthly Performance Trend</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-red-400 border-dashed border-t-2 border-red-400"></div>
              <span>Target ({objective.target})</span>
            </div>
            
            {!isLineWise ? (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Actual Value</span>
              </div>
            ) : (
              // Legend for sub-objectives
              objective.subTargets?.map((st, index) => (
                <div key={st.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}></div>
                  <span>{st.name}</span>
                </div>
              ))
            )}
            
            {isLineWise && (
               <div className="flex items-center gap-1.5">
                 <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                 <span>Total (Actual value)</span>
               </div>
            )}
          </div>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 13, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 13, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                dx={-10}
                domain={['auto', 'auto']}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
                formatter={(value: any, name: any) => {
                  if (value === null) return ['No reading', name];
                  let labelName = name;
                  if (name === 'value') labelName = isLineWise ? 'Total Actual' : 'Actual';
                  if (typeof name === 'string' && name.startsWith('st_')) {
                    const st = objective.subTargets?.find(t => t.id === name.replace('st_', ''));
                    if (st) labelName = st.name;
                  }
                  return [<span className="font-semibold">{value}</span>, labelName];
                }}
                labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}
              />
              <ReferenceLine 
                y={objective.target} 
                stroke="#f87171" 
                strokeDasharray="5 5" 
                strokeWidth={2}
              />
              
              {!isLineWise ? (
                 <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  connectNulls={true}
                />
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1e293b" // Total Value (dark slate)
                    strokeWidth={3}
                    dot={{ fill: '#1e293b', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls={true}
                  />
                  {objective.subTargets?.map((st, idx) => (
                    <Line
                      key={`st_${st.id}`}
                      type="monotone"
                      dataKey={`st_${st.id}`}
                      stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: LINE_COLORS[idx % LINE_COLORS.length], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: LINE_COLORS[idx % LINE_COLORS.length], stroke: '#fff', strokeWidth: 2 }}
                      connectNulls={true}
                    />
                  ))}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Monthly breakdown • {getFYLabel()}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Month</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Target Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actual Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remarks & Insights</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chartData.map((row, idx) => {
                const hasData = !!row.latestMeasurementObj;
                const isExpanded = isLineWise && expandedMonths[row.fullMonth];
                
                return (
                  <React.Fragment key={idx}>
                    <tr 
                      className={`hover:bg-slate-50 transition-colors ${isLineWise && hasData ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (isLineWise && hasData) {
                          toggleMonth(row.fullMonth);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isLineWise && hasData ? (
                            isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
                          ) : isLineWise ? (
                            <div className="w-4 h-4"></div>
                          ) : null}
                          <span className="text-sm font-medium text-slate-900">
                            {format(parseISO(`${row.fullMonth}-01`), 'MMMM yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{row.target}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900">
                          {row.value !== null ? row.value : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(row.value, objective.target, objective.higherIsBetter)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500 italic">{row.remarks}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {hasData && canManageMeasurements && (
                          <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 onEditMeasurement(row.latestMeasurementObj, objective);
                               }}
                               className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                               title="Edit Reading"
                             >
                               <Edit className="w-3.5 h-3.5" />
                             </button>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 onDeleteMeasurement(row.latestMeasurementObj.id);
                               }}
                               className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                               title="Delete Reading"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    
                    {/* Render sub-target breakdowns below the parent row if it exists */}
                    {isExpanded && row.latestMeasurementObj && objective.subTargets?.map(st => {
                       const subValue = row.latestSubValuesRecord?.[st.id];
                       return (
                         <tr key={`${idx}_st_${st.id}`} className="bg-slate-50/50">
                            <td className="px-6 py-2 whitespace-nowrap pl-10">
                              <span className="text-sm text-slate-600 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                {st.name}
                              </span>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <span className="text-sm text-slate-400">{st.target !== undefined ? st.target : '-'}</span>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-700">
                                {subValue !== null && subValue !== undefined ? subValue : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                            </td>
                            <td className="px-6 py-2">
                            </td>
                            <td className="px-6 py-2">
                            </td>
                         </tr>
                       )
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
