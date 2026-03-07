import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';

interface CalibrationEvent {
  id: string;
  name: string;
  department: string;
  nextCalibrationDate: string;
  status: 'OK' | 'DUE' | 'UPCOMING';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  calibrations: CalibrationEvent[];
}

// Deterministic color generator for departments
const getDepartmentColor = (department: string) => {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  ];
  
  let hash = 0;
  for (let i = 0; i < department.length; i++) {
    hash = department.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export default function CalibrationCalendarModal({ isOpen, onClose, calibrations }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!isOpen) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Get unique departments for legend
  const departments = Array.from(new Set(calibrations.map(c => c.department))).sort();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              Calibration Calendar
            </h2>
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-50 border-r border-slate-200">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <span className="px-4 py-2 font-semibold text-slate-700 min-w-[160px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-50 border-l border-slate-200">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap gap-4">
          {departments.map(dept => {
            const color = getDepartmentColor(dept);
            return (
              <div key={dept} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${color.bg} border ${color.border}`}></div>
                <span className="text-slate-600 font-medium">{dept}</span>
              </div>
            );
          })}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            {/* Days Header */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-white p-3 text-center text-sm font-semibold text-slate-600">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day) => {
              const dayCalibrations = calibrations.filter(cal => 
                isSameDay(parseISO(cal.nextCalibrationDate), day)
              );

              return (
                <div 
                  key={day.toString()} 
                  className={`bg-white min-h-[120px] p-2 flex flex-col gap-1 transition-colors hover:bg-slate-50
                    ${!isSameMonth(day, monthStart) ? 'bg-slate-50 text-slate-400' : 'text-slate-800'}
                  `}
                >
                  <div className={`text-right text-sm font-medium mb-1
                    ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center ml-auto' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-thin">
                    {dayCalibrations.map(cal => {
                      const color = getDepartmentColor(cal.department);
                      return (
                        <div 
                          key={cal.id}
                          className={`text-xs p-1.5 rounded border mb-0.5 cursor-pointer truncate transition-all hover:scale-[1.02] hover:shadow-sm group relative
                            ${color.bg} ${color.text} ${color.border}
                          `}
                        >
                          <span className="font-semibold">{cal.name}</span>
                          
                          {/* Tooltip */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-max max-w-[200px]">
                            <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg">
                              <p className="font-semibold">{cal.name}</p>
                              <p className="opacity-90">{cal.department}</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
