import { X } from 'lucide-react';

const formatDate = (dateInput: string | Date | undefined | null) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

interface Equipment {
  id: string;
  equipmentNumber: string;
  name: string;
  equipmentId: string;
  make: string;
  model?: string;
  line?: string;
  location: string;
  department: string;
  purchaseDate?: string;
  lastCalibrationDate?: string;
  nextCalibrationDate: string;
  calibrationFrequency: number;
  status: 'active' | 'maintenance' | 'inactive';
  remark?: string;
  alertDaysBeforeDue: number;
  createdBy?: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment;
}

export default function EquipmentDetailModal({ isOpen, onClose, equipment }: Props) {
  if (!isOpen) return null;

  const getCalibrationStatus = () => {
    if (equipment.status === 'maintenance' || equipment.status === 'inactive') {
      return { label: 'Inactive', color: 'text-slate-600 bg-slate-100' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDue = new Date(equipment.nextCalibrationDate);
    nextDue.setHours(0, 0, 0, 0);

    if (nextDue < today) return { label: 'Due', color: 'text-red-600 bg-red-100' };
    
    const alertDate = new Date(nextDue);
    alertDate.setDate(alertDate.getDate() - equipment.alertDaysBeforeDue);
    
    if (today >= alertDate && today < nextDue) {
      return { label: 'Upcoming', color: 'text-yellow-600 bg-yellow-100' };
    }
    return { label: 'OK', color: 'text-green-600 bg-green-100' };
  };

  const calibStatus = getCalibrationStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{equipment.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{equipment.equipmentNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Equipment ID</p>
                  <p className="text-sm font-medium text-slate-800">{equipment.equipmentId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Make</p>
                  <p className="text-sm font-medium text-slate-800">{equipment.make}</p>
                </div>
                {equipment.model && (
                  <div>
                    <p className="text-xs text-slate-500">Model</p>
                    <p className="text-sm font-medium text-slate-800">{equipment.model}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="text-sm font-medium text-slate-800">{equipment.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="text-sm font-medium text-slate-800">{equipment.location}</p>
                </div>
                {equipment.line && (
                  <div>
                    <p className="text-xs text-slate-500">Line/Area</p>
                    <p className="text-sm font-medium text-slate-800">{equipment.line}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    equipment.status === 'active' ? 'bg-green-100 text-green-700' :
                    equipment.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Calibration Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase">Calibration Details</h3>
              <div className="space-y-3">
                {equipment.purchaseDate && (
                  <div>
                    <p className="text-xs text-slate-500">Purchase Date</p>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(equipment.purchaseDate)}
                    </p>
                  </div>
                )}
                {equipment.lastCalibrationDate && (
                  <div>
                    <p className="text-xs text-slate-500">Last Calibration</p>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(equipment.lastCalibrationDate)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Next Calibration Due</p>
                  <p className="text-sm font-medium text-slate-800">
                    {formatDate(equipment.nextCalibrationDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Calibration Frequency</p>
                  <p className="text-sm font-medium text-slate-800">{equipment.calibrationFrequency} days</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Alert Days Before Due</p>
                  <p className="text-sm font-medium text-slate-800">{equipment.alertDaysBeforeDue} days</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Calibration Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${calibStatus.color}`}>
                    {calibStatus.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {equipment.remark && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase">Remarks</h3>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{equipment.remark}</p>
              </div>
            )}

            {/* Created By */}
            {equipment.createdBy && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase">Created By</h3>
                <p className="text-sm text-slate-600">
                  {equipment.createdBy.firstName} {equipment.createdBy.lastName} ({equipment.createdBy.email})
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
