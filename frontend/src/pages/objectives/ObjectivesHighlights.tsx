import { useState } from 'react';
import { Target, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line, ReferenceLine, Cell } from 'recharts';

interface DashboardStats {
  summary: {
    total: number;
    active: number;
    completed: number;
    onTrack: number;
    atRisk: number;
    behind: number;
  };
  byType: {
    quality: number;
    environmental: number;
    safety: number;
  };
  objectives: any[];
}

function StatCard({ 
  title, 
  value, 
  color, 
  icon: Icon,
  isActive,
  onClick
}: { 
  title: string, 
  value: number, 
  color: string, 
  icon?: any,
  isActive?: boolean,
  onClick?: () => void
}) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl p-5 shadow-sm border flex items-center justify-between transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        isActive 
          ? `ring-2 ring-offset-2 ${color.replace('text-', 'ring-')}` 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div>
        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
      </div>
      {Icon && <div className={`p-3 rounded-full ${isActive ? color.replace('text-', 'bg-').replace('600', '100') : 'bg-slate-50 text-slate-400'}`}><Icon className="w-6 h-6" /></div>}
    </div>
  );
}

// Generates data for department-wise objective distribution
function getDepartmentDistData(objectives: any[]) {
  const deptCounts: Record<string, number> = {};
  objectives.forEach(obj => {
    const dept = obj.department || 'Unassigned';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  
  return Object.entries(deptCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8
}

// Sparkline for top KPIs
function KPISparkline({ objective }: { objective: any }) {
  const measurements = objective.measurements || [];
  // Sort by date to get chronological order for sparkline
  const sorted = [...measurements].sort((a, b) => 
    new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
  );
  
  const data = sorted.map((m: any) => ({
    value: Number(m.actualValue),
    date: m.measurementDate
  }));

  const hasData = data.length > 0;
  
  // Use progressStatus attached to the objective from the backend if available
  // Fallback to simple logic if not evaluated
  let statusBadge = 'NO DATA';
  let statusColor = 'bg-slate-500/20 text-slate-300';
  let isGood = false;

  if (hasData) {
    if (objective.progressStatus === 'achieved' || objective.progressStatus === 'on_track') {
      statusBadge = 'ON TRACK';
      statusColor = 'bg-emerald-500/20 text-emerald-300';
      isGood = true;
    } else if (objective.progressStatus === 'at_risk') {
      statusBadge = 'AT RISK';
      statusColor = 'bg-yellow-500/20 text-yellow-300';
    } else if (objective.progressStatus === 'behind') {
      statusBadge = 'BEHIND';
      statusColor = 'bg-red-500/20 text-red-300';
    } else {
      // Fallback
      statusBadge = 'ON TRACK';
      statusColor = 'bg-emerald-500/20 text-emerald-300';
      isGood = true;
    }
  }

  return (
    <div className="bg-slate-900 rounded-xl p-5 text-white shadow-lg border border-slate-800 relative overflow-hidden group">
      {/* Background glowing effect */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${isGood ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
            {objective.department || 'General'}
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColor}`}>
              {statusBadge}
            </span>
          </div>
          <h3 className="font-bold text-lg text-white leading-tight">{objective.name}</h3>
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mb-4 relative z-10">
        <span className="text-3xl font-bold font-mono">
          {objective.latestValue !== null && objective.latestValue !== undefined ? objective.latestValue : '-'}
        </span>
        <span className="text-sm text-slate-400">{objective.uom}</span>
      </div>

      <div className="h-16 w-full relative z-10">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={isGood ? '#10b981' : '#f43f5e'}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={true}
              />
              <ReferenceLine y={objective.target} stroke="#475569" strokeDasharray="3 3" strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-600">No trend data</div>
        )}
      </div>
      <div className="flex justify-between items-center mt-2 text-xs text-slate-500 relative z-10">
        <span>Target: {objective.target}</span>
        <span>{objective.higherIsBetter ? '↑' : '↓'}</span>
      </div>
    </div>
  );
}

export function ObjectivesHighlights({ stats }: { stats: DashboardStats | null }) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'total' | 'onTrack' | 'atRisk' | 'behind'>('total');

  if (!stats) return null;

  const departmentData = getDepartmentDistData(stats.objectives || []);
  
  // Get all KPIs with data for sparklines, filter by department if selected
  const allKPIsWithData = (stats.objectives || [])
    .filter(o => o.measurements && o.measurements.length > 0);
    
  const displayKPIs = allKPIsWithData.filter(kpi => {
    // 1. Department Filter
    if (selectedDept && kpi.department !== selectedDept) return false;
    
    // 2. Status Filter
    if (selectedStatus === 'total') return true;
    
    // Determine KPI Status for filtering directly from the backend calculation
    // backend values: 'achieved', 'on_track', 'at_risk', 'behind'
    const status = kpi.progressStatus;
    
    if (selectedStatus === 'onTrack') {
      return status === 'achieved' || status === 'on_track';
    } else if (selectedStatus === 'atRisk') {
      return status === 'at_risk';
    } else if (selectedStatus === 'behind') {
      return status === 'behind';
    }
    
    return false;
  });

  const handleBarClick = (data: any) => {
    if (selectedDept === data.name) {
      setSelectedDept(null); // Toggle off
    } else {
      setSelectedDept(data.name);
    }
  };

  const handleStatusClick = (status: 'total' | 'onTrack' | 'atRisk' | 'behind') => {
    setSelectedStatus(status);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Section: Stacked Summary Cards & Department Chart */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left: 2x2 Stacked Summary Cards */}
        <div className="lg:w-1/3 grid grid-cols-2 gap-4 h-[300px]">
          <StatCard 
            title="Total KPIs" 
            value={stats.summary.total} 
            color="text-slate-800" 
            icon={Target} 
            isActive={selectedStatus === 'total'}
            onClick={() => handleStatusClick('total')}
          />
          <StatCard 
            title="On Track" 
            value={stats.summary.onTrack} 
            color="text-emerald-600" 
            icon={TrendingUp} 
            isActive={selectedStatus === 'onTrack'}
            onClick={() => handleStatusClick('onTrack')}
          />
          <StatCard 
            title="At Risk" 
            value={stats.summary.atRisk} 
            color="text-yellow-600" 
            icon={AlertTriangle} 
            isActive={selectedStatus === 'atRisk'}
            onClick={() => handleStatusClick('atRisk')}
          />
          <StatCard 
            title="Behind" 
            value={stats.summary.behind} 
            color="text-red-600" 
            icon={TrendingDown} 
            isActive={selectedStatus === 'behind'}
            onClick={() => handleStatusClick('behind')}
          />
        </div>

        {/* Right: Department Distribution Chart aligned with cards */}
        <div className="lg:w-2/3 bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-[300px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Objectives by Department</h2>
            {selectedDept && (
              <button 
                onClick={() => setSelectedDept(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]} 
                  className="cursor-pointer"
                  onClick={handleBarClick}
                >
                  {departmentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={selectedDept === entry.name ? '#2563eb' : selectedDept ? '#93c5fd' : '#3b82f6'} 
                      className="transition-colors duration-300 cursor-pointer hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hero KPIs displaying all by default, or filtered */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {selectedDept ? `KPIs for ${selectedDept}` : 'All KPI Trends'}
            {selectedStatus !== 'total' && <span className="text-slate-500 font-normal"> • Filtered</span>}
          </h2>
          {(selectedDept || selectedStatus !== 'total') && (
            <button 
              onClick={() => {
                setSelectedDept(null);
                setSelectedStatus('total');
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
        
        {displayKPIs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayKPIs.map((kpi: any) => (
              <KPISparkline key={kpi.id} objective={kpi} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            No KPI data available for the selected criteria.
          </div>
        )}
      </div>

      {/* Type Distribution */}
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Objectives by Standard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold mb-1">{stats.byType.quality}</div>
            <div className="text-blue-100 text-sm font-medium">QMS (ISO 9001)</div>
          </div>
          <Target className="w-10 h-10 text-white/30" />
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold mb-1">{stats.byType.environmental}</div>
            <div className="text-emerald-100 text-sm font-medium">EMS (ISO 14001)</div>
          </div>
          <Target className="w-10 h-10 text-white/30" />
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold mb-1">{stats.byType.safety}</div>
            <div className="text-orange-100 text-sm font-medium">OHSMS (ISO 45001)</div>
          </div>
          <Target className="w-10 h-10 text-white/30" />
        </div>
      </div>
    </div>
  );
}
