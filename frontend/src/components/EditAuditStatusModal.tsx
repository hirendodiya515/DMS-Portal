import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface EditAuditStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (isPlanned: boolean, outcome: 'actual' | 'cancelled' | null) => void;
  department: string;
  month: string;
  currentStatus: string[];
}

export default function EditAuditStatusModal({
  isOpen,
  onClose,
  onSave,
  department,
  month,
  currentStatus
}: EditAuditStatusModalProps) {
  const [isPlanned, setIsPlanned] = useState(false);
  const [outcome, setOutcome] = useState<'actual' | 'cancelled' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsPlanned(currentStatus.includes('planned'));
      if (currentStatus.includes('actual')) setOutcome('actual');
      else if (currentStatus.includes('cancelled')) setOutcome('cancelled');
      else setOutcome(null);
    }
  }, [isOpen, currentStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/50 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="absolute right-4 top-4">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Update Audit Status
            </h3>
            <div className="mt-2">
              <p className="text-sm text-slate-500">
                {department} - {month}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              
              {/* Plan Setting */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3 block">Planning</h4>
                <button
                  onClick={() => setIsPlanned(!isPlanned)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isPlanned
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isPlanned ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isPlanned && <Check className="w-3 h-3" />}
                    </div>
                    <span className="font-medium text-slate-700">Planned Audit</span>
                  </div>
                </button>
              </div>

              {/* Outcome Setting */}
              <div>
                 <h4 className="text-sm font-medium text-slate-700 mb-3 block">Outcome</h4>
                 <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setOutcome(null)}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        outcome === null
                          ? 'border-slate-500 bg-slate-50'
                          : 'border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-700">Pending / None</span>
                      {outcome === null && <Check className="w-4 h-4 text-slate-600" />}
                    </button>

                    <button
                      onClick={() => setOutcome('actual')}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        outcome === 'actual'
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-100 hover:border-green-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                         <span className="w-3 h-3 rounded-full bg-green-400"></span>
                         <span className="text-sm font-medium text-slate-700">Actual (Completed)</span>
                      </div>
                      {outcome === 'actual' && <Check className="w-4 h-4 text-green-600" />}
                    </button>

                    <button
                      onClick={() => setOutcome('cancelled')}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        outcome === 'cancelled'
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-100 hover:border-red-200'
                      }`}
                    >
                       <div className="flex items-center gap-2">
                         <span className="w-3 h-3 rounded-full bg-red-400"></span>
                         <span className="text-sm font-medium text-slate-700">Cancelled</span>
                      </div>
                      {outcome === 'cancelled' && <Check className="w-4 h-4 text-red-600" />}
                    </button>
                 </div>
              </div>

            </div>
            
             <div className="mt-8 flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-300"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onSave(isPlanned, outcome)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                    Save Changes
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
