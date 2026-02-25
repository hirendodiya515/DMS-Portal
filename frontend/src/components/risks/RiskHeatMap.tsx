import React from 'react';

interface RiskHeatMapProps {
  matrix: { [key: string]: number };
  onCellClick?: (likelihood: number, severity: number) => void;
}

const RiskHeatMap: React.FC<RiskHeatMapProps> = ({ matrix, onCellClick }) => {
  const getCellColor = (likelihood: number, severity: number) => {
    const rating = likelihood * severity;
    if (rating <= 4) return 'bg-[#10b981]';
    if (rating <= 9) return 'bg-[#f59e0b]';
    if (rating <= 16) return 'bg-[#f97316]';
    return 'bg-[#dc2626]';
  };

  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">5x5 Risk Matrix</h3>
          <p className="text-[9px] text-slate-400 font-medium">Likelihood vs. Severity</p>
        </div>
        <button className="text-blue-600 text-[9px] font-bold uppercase tracking-wider hover:underline">Full Details ↗</button>
      </div>

      {/* Matrix */}
      <div className="relative flex ml-9 mt-1">
        {/* Y-Axis Label */}
        <div className="absolute -left-14 top-1/2 -rotate-90 origin-center text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
          Likelihood
        </div>

        <div className="w-full">
          <div className="grid grid-cols-5 gap-px mb-1">
            {[5, 4, 3, 2, 1].map((l) => (
              <React.Fragment key={l}>
                {/* Row number */}
                <div
                  className="absolute -left-4 flex items-center text-[9px] font-black text-slate-400"
                  style={{ top: `${(5 - l) * 20}%`, height: '20%' }}
                >
                  {l}
                </div>
                {[1, 2, 3, 4, 5].map((s) => {
                  const count = matrix[`${l}-${s}`] || 0;
                  return (
                    <div
                      key={`${l}-${s}`}
                      onClick={() => onCellClick?.(l, s)}
                      className={`${getCellColor(l, s)} w-full h-8 rounded-[2px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative group`}
                    >
                      {count > 0 && (
                        <div className="w-4 h-4 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white font-black text-[8px]">
                          {count}
                        </div>
                      )}
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-800 text-white text-[8px] py-0.5 px-1.5 rounded whitespace-nowrap pointer-events-none">
                        L:{l} S:{s} — {count} risks
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* X-Axis Numbers */}
          <div className="grid grid-cols-5 gap-px place-items-center mt-1 mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="text-[9px] font-black text-slate-400">{s}</div>
            ))}
          </div>

          {/* X-Axis Label */}
          <div className="text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">Severity</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-3 pt-2 border-t border-slate-50">
        {[
          { color: 'bg-[#10b981]', label: 'Low' },
          { color: 'bg-[#f59e0b]', label: 'Medium' },
          { color: 'bg-[#f97316]', label: 'High' },
          { color: 'bg-[#dc2626]', label: 'Extreme' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-[2px] ${item.color}`}></div>
            <span className="text-[9px] font-bold text-slate-400 uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskHeatMap;
