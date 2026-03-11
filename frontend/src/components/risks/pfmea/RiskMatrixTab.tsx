import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { pfmeaApi } from '../../../lib/pfmeaApi';

interface MatrixPoint {
  id: string;
  processStep: string;
  failureMode: string;
  severity: number;
  occurrence: number;
  rpn: number;
  responsible: string;
}

export default function RiskMatrixTab({ pfmeaId }: { pfmeaId: string }) {
  const [hoveredPoint, setHoveredPoint] = useState<MatrixPoint | null>(null);
  const [points, setPoints] = useState<MatrixPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pfmeaId === 'ALL') {
      pfmeaApi.getAll().then(allProcesses => {
        Promise.all(allProcesses.map((p: any) => pfmeaApi.getOne(p.id))).then(responses => {
          const allPoints = responses.flatMap(res => {
            if (!res || !res.worksheetRows) return [];
            return res.worksheetRows.map((r: any) => ({
              id: r.id,
              processStep: `${res.processName}: ${r.processStep}`,
              failureMode: r.failureMode,
              severity: r.severity || 1,
              occurrence: r.occurrence || 1,
              rpn: r.rpn || 1,
              responsible: r.responsible || 'Unassigned'
            }));
          });
          setPoints(allPoints);
          setLoading(false);
        });
      });
    } else if (pfmeaId) {
      pfmeaApi.getOne(pfmeaId).then(res => {
        if (res && res.worksheetRows) {
          const matrixPoints = res.worksheetRows.map((r: any) => ({
            id: r.id,
            processStep: r.processStep,
            failureMode: r.failureMode,
            severity: r.severity || 1,
            occurrence: r.occurrence || 1,
            rpn: r.rpn || 1,
            responsible: r.responsible || 'Unassigned'
          }));
          setPoints(matrixPoints);
        }
        setLoading(false);
      });
    }
  }, [pfmeaId]);

  if (loading) return <div className="p-4 text-slate-500 font-bold">Generating Risk Matrix...</div>;

  const getCellColor = (sev: number, occ: number) => {
    const risk = sev * occ;
    if (risk >= 15) return 'bg-red-50 hover:bg-red-100 border-red-200'; // Critical
    if (risk >= 10) return 'bg-orange-50 hover:bg-orange-100 border-orange-200'; // High
    if (risk >= 5) return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'; // Medium
    return 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'; // Low
  };

  const getPointsInCell = (sev: number, occ: number) => {
    return points.filter(p => p.severity === sev && p.occurrence === occ);
  };

  return (
    <div className="flex flex-col h-full lg:flex-row gap-8">
      {/* Matrix Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center">
        <h3 className="font-black text-xl text-slate-800 mb-6 w-full text-center">Risk Assessment Matrix</h3>
        
        <div className="relative flex">
          {/* Y-axis Label */}
          <div className="flex items-center justify-center w-12 mr-2">
            <span className="transform -rotate-90 font-bold text-slate-500 tracking-widest whitespace-nowrap text-sm">SEVERITY</span>
          </div>
          
          <div className="flex flex-col">
            {/* Grid */}
            <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              {[5, 4, 3, 2, 1].map((sev) => (
                <React.Fragment key={`row-${sev}`}>
                  {[1, 2, 3, 4, 5].map((occ) => {
                    const points = getPointsInCell(sev, occ);
                    return (
                      <div 
                        key={`cell-${sev}-${occ}`} 
                        className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-md border flex flex-wrap items-center justify-center gap-1 transition-colors relative cursor-pointer ${getCellColor(sev, occ)}`}
                      >
                        {/* Cell coordinates for debugging/clarity */}
                        <span className="absolute text-[8px] sm:text-[10px] text-slate-400 opacity-50 bottom-1 right-1">{sev},{occ}</span>
                        
                        {/* Data Points */}
                        {points.map((p) => (
                          <div 
                            key={p.id}
                            className="w-3 h-3 sm:w-4 sm:h-4 bg-slate-800 rounded-full shadow-md animate-pulse border-2 border-white transform hover:scale-150 transition-all z-10"
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            onClick={() => alert(`Navigating to ${p.failureMode} in Worksheet...`)}
                            title={p.failureMode}
                          />
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            
            {/* X-axis Label */}
            <div className="mt-4 flex items-center justify-center">
              <span className="font-bold text-slate-500 tracking-widest text-sm">OCCURRENCE</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div><span className="text-sm font-semibold text-slate-600">Critical Risk</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div><span className="text-sm font-semibold text-slate-600">High Risk</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div><span className="text-sm font-semibold text-slate-600">Medium Risk</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded"></div><span className="text-sm font-semibold text-slate-600">Low Risk</span></div>
        </div>
      </div>

      {/* Details Side Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <div className={`flex-1 rounded-2xl border transition-all duration-300 p-6 shadow-sm ${hoveredPoint ? 'bg-white border-blue-200 shadow-blue-50' : 'bg-slate-50 border-slate-200 border-dashed flex items-center justify-center'}`}>
          {hoveredPoint ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Risk Details</h4>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{hoveredPoint.processStep}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase mb-1 block">Failure Mode</span>
                  <p className="text-slate-800 font-medium">{hoveredPoint.failureMode}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 font-bold block mb-1">Severity</span>
                    <span className="text-xl font-black text-slate-700">{hoveredPoint.severity}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 font-bold block mb-1">Occurrence</span>
                    <span className="text-xl font-black text-slate-700">{hoveredPoint.occurrence}</span>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                  <span className="text-sm text-blue-800 font-bold">Calculated RPN</span>
                  <span className="text-2xl font-black text-blue-700">{hoveredPoint.rpn}</span>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase mb-1 block">Responsible Person</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {hoveredPoint.responsible.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{hoveredPoint.responsible}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Hover over a point on the matrix to view risk details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
