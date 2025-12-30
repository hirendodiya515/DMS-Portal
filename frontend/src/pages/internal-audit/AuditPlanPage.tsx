import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import EditAuditStatusModal from '../../components/EditAuditStatusModal';

interface AuditStatus {
  month: string; // Format: YYYY-MM
  status: 'planned' | 'actual' | 'cancelled';
}

export default function AuditPlanPage() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const user = useAuthStore((state) => state.user);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{dept: string, month: string, status: string | null} | null>(null);

  // State for audit data
  const [auditData, setAuditData] = useState<Record<string, AuditStatus[]>>({});

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchAuditPlans()]);
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/settings/departments');
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments(['IT', 'HR', 'Finance', 'Operations', 'Quality', 'Sales', 'Marketing']);
    }
  };

  const fetchAuditPlans = async () => {
      try {
          const response = await api.get('/audit-plans');
          const plans = response.data; // Array of { department, month, isPlanned, outcome }
          
          // Transform to Record<department, AuditStatus[]>
          const grouped: Record<string, AuditStatus[]> = {};
          plans.forEach((p: any) => {
              if (!grouped[p.department]) grouped[p.department] = [];
              if (p.isPlanned) grouped[p.department].push({ month: p.month, status: 'planned' });
              if (p.outcome) grouped[p.department].push({ month: p.month, status: p.outcome });
          });
          setAuditData(grouped);
      } catch (error) {
          console.error('Failed to fetch audit plans:', error);
      } finally {
          setLoading(false);
      }
  };

  const years = [currentYear, currentYear + 1, currentYear + 2];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  /* 
   * Helper to get styling for split cells
   */
  const getCellStyle = (dept: string, year: number, monthIndex: number) => {
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const entries = auditData[dept]?.filter(d => d.month === monthStr) || [];
    
    const isPlanned = entries.some(e => e.status === 'planned');
    const actualEntry = entries.find(e => e.status === 'actual');
    const cancelledEntry = entries.find(e => e.status === 'cancelled');

    // Base Colors
    const colorPlan = '#bfdbfe'; // blue-200
    const colorActual = '#bbf7d0'; // green-200
    const colorCancelled = '#fecaca'; // red-200

    if (isPlanned && (actualEntry || cancelledEntry)) {
        // Diagonal Split
        const outcomeColor = actualEntry ? colorActual : colorCancelled;
        return {
            background: `linear-gradient(to bottom right, ${colorPlan} 50%, ${outcomeColor} 50%)`,
            border: '1px solid #cbd5e1' // slate-300
        };
    }

    if (actualEntry) return { backgroundColor: colorActual, borderColor: '#4ade80' }; // green-400
    if (cancelledEntry) return { backgroundColor: colorCancelled, borderColor: '#f87171' }; // red-400
    if (isPlanned) return { backgroundColor: colorPlan, borderColor: '#60a5fa' }; // blue-400

    return {};
  };

  const getStatusText = (dept: string, year: number, monthIndex: number) => {
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const entries = auditData[dept]?.filter(d => d.month === monthStr) || [];
    
    // Simplistic text logic: show all initials present
    let text = '';
    if (entries.some(e => e.status === 'planned')) text += 'P';
    if (entries.some(e => e.status === 'actual')) text += (text ? '/A' : 'A');
    if (entries.some(e => e.status === 'cancelled')) text += (text ? '/C' : 'C');
    
    return text || null;
  };

  const getStatusList = (dept: string, monthStr: string) => {
      return auditData[dept]?.filter(d => d.month === monthStr).map(d => d.status) || [];
  };

  const handleCellClick = (dept: string, year: number, monthIndex: number) => {
    if (user?.role !== 'admin') return;

    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    setSelectedCell({
        dept,
        month: monthStr,
        status: getStatusList(dept, monthStr) as any // Cast for now, will map in Modal
    });
    setIsModalOpen(true);
  };

  const handleSaveStatus = async (isPlanned: boolean, outcome: 'actual' | 'cancelled' | null) => {
      if (!selectedCell) return;
      
      const { dept, month } = selectedCell;
      
      // Optimistic Update
      setAuditData(prev => {
          const deptData = prev[dept] || [];
          const otherData = deptData.filter(d => d.month !== month);
          
          const newEntries: AuditStatus[] = [];
          if (isPlanned) newEntries.push({ month, status: 'planned' });
          if (outcome) newEntries.push({ month, status: outcome });

          return {
              ...prev,
              [dept]: [...otherData, ...newEntries]
          };
      });
      
      setIsModalOpen(false);
      setSelectedCell(null);

      // Persist to Backend
      try {
          await api.post('/audit-plans', {
              department: dept,
              month: month,
              isPlanned,
              outcome
          });
      } catch (error) {
          console.error('Failed to save audit plan:', error);
          // Ideally revert optimistic update here, but omitting for brevity
      }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading audit plan...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">IMS Internal Audit Plan</h1>
          <p className="text-slate-500 text-sm mt-1">3-Year Strategic Audit Schedule</p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-200 border border-blue-400 rounded-sm"></span>
            <span>Plan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-200 border border-green-400 rounded-sm"></span>
            <span>Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-200 border border-red-400 rounded-sm"></span>
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full border-collapse relative">
            <thead>
              {/* Year Header */}
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-slate-50 border-b border-r border-slate-200 p-4 min-w-[200px] text-left font-semibold text-slate-700 h-[60px]">
                  Department
                </th>
                {years.map(year => (
                  <th key={year} colSpan={12} className="sticky top-0 z-10 bg-slate-100 border-b border-r border-slate-200 p-2 text-center font-bold text-slate-700">
                    {year}
                  </th>
                ))}
              </tr>
              {/* Month Header */}
              <tr>
                <th className="sticky left-0 top-[41px] z-20 bg-slate-50 border-b border-r border-slate-200 shadow-sm">
                  {/* Empty corner cell */}
                </th>
                {years.map(year => (
                  months.map((month, index) => (
                    <th key={`${year}-${index}`} className="sticky top-[41px] z-10 bg-slate-50 border-b border-r border-slate-200 p-2 min-w-[60px] text-center text-xs font-semibold text-slate-500">
                      {month}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept} className="group hover:bg-slate-50">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-200 p-3 font-medium text-slate-700 text-sm whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    {dept}
                  </td>
                  {years.map(year => (
                    months.map((_, index) => (
                      <td 
                        key={`${dept}-${year}-${index}`} 
                        onClick={() => handleCellClick(dept, year, index)}
                        className={`border-b border-r border-slate-200 p-1 text-center relative h-10 min-w-[60px] transition-colors
                          ${user?.role === 'admin' ? 'cursor-pointer hover:bg-slate-100' : 'cursor-default'}
                        `}
                        style={getCellStyle(dept, year, index)}
                        title={`${dept} - ${months[index]} ${year}`}
                      >
                        <span className="text-xs font-medium text-slate-700">
                          {getStatusText(dept, year, index)}
                        </span>
                      </td>
                    ))
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCell && (
          <EditAuditStatusModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveStatus}
            department={selectedCell.dept}
            month={selectedCell.month}
            currentStatus={selectedCell.status as any}
          />
      )}
    </div>
  );
}
