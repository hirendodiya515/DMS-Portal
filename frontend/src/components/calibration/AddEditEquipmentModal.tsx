import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../lib/api';

interface Equipment {
  id?: string;
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
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  equipment: Equipment | null;
}

export default function AddEditEquipmentModal({ isOpen, onClose, onSave, equipment }: Props) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [formData, setFormData] = useState<Equipment>({
    name: '',
    equipmentId: '',
    make: '',
    model: '',
    line: '',
    location: '',
    department: '',
    purchaseDate: '',
    lastCalibrationDate: '',
    nextCalibrationDate: '',
    calibrationFrequency: 365,
    status: 'active',
    remark: '',
    alertDaysBeforeDue: 7,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      if (equipment) {
        setFormData({
          ...equipment,
          purchaseDate: equipment.purchaseDate ? equipment.purchaseDate.split('T')[0] : '',
          lastCalibrationDate: equipment.lastCalibrationDate ? equipment.lastCalibrationDate.split('T')[0] : '',
          nextCalibrationDate: equipment.nextCalibrationDate.split('T')[0],
        });
      } else {
        // Reset form for new equipment
        setFormData({
          name: '',
          equipmentId: '',
          make: '',
          model: '',
          line: '',
          location: '',
          department: '',
          purchaseDate: '',
          lastCalibrationDate: '',
          nextCalibrationDate: '',
          calibrationFrequency: 365,
          status: 'active',
          remark: '',
          alertDaysBeforeDue: 7,
        });
      }
    }
  }, [isOpen, equipment]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/settings/departments');
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments(['Production', 'Quality', 'Maintenance', 'R&D', 'Warehouse']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (equipment?.id) {
        // Update existing equipment
        await api.patch(`/equipment/${equipment.id}`, formData);
      } else {
        // Create new equipment
        await api.post('/equipment', formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save equipment:', error);
      alert('Failed to save equipment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">
            {equipment ? 'Edit Equipment' : 'Add New Equipment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Equipment Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Equipment Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter equipment name"
              />
            </div>

            {/* Equipment ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Equipment ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.equipmentId}
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Serial/ID number"
              />
            </div>

            {/* Make */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Make <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Manufacturer"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Model number"
              />
            </div>

            {/* Line */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Line/Area</label>
              <input
                type="text"
                value={formData.line}
                onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Production line or area"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Physical location"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Last Calibration Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Calibration Date
              </label>
              <input
                type="date"
                value={formData.lastCalibrationDate}
                onChange={(e) => setFormData({ ...formData, lastCalibrationDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Next Calibration Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Next Calibration Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.nextCalibrationDate}
                onChange={(e) => setFormData({ ...formData, nextCalibrationDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Calibration Frequency */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Calibration Frequency (days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.calibrationFrequency}
                onChange={(e) => setFormData({ ...formData, calibrationFrequency: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 365 for annual"
              />
            </div>

            {/* Alert Days Before Due */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Alert Days Before Due <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.alertDaysBeforeDue}
                onChange={(e) => setFormData({ ...formData, alertDaysBeforeDue: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 7"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'maintenance' | 'inactive' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Remark */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Remark</label>
              <textarea
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : equipment ? 'Update Equipment' : 'Add Equipment'}
          </button>
        </div>
      </div>
    </div>
  );
}
