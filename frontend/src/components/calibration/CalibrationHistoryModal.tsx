import { useState, useEffect } from 'react';
import { X, Upload, Trash2, FileText } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface Equipment {
  id: string;
  equipmentNumber: string;
  name: string;
  calibrationFrequency?: number;
}

interface CalibrationHistory {
  id: string;
  calibrationDate: string;
  certificateNumber: string;
  certifiedBy: string;
  remarks?: string;
  certificatePath?: string;
  uploadedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment;
  onHistoryAdded: () => void;
}

export default function CalibrationHistoryModal({ isOpen, onClose, equipment, onHistoryAdded }: Props) {
  const user = useAuthStore((state) => state.user);
  const [historyRecords, setHistoryRecords] = useState<CalibrationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    calibrationDate: '',
    certificateNumber: '',
    certifiedBy: '',
    nextCalibrationDate: '',
    remarks: '',
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const canModify = user?.role === 'admin' || user?.role === 'creator';

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      setShowAddForm(false);
      resetForm();
    }
  }, [isOpen, equipment.id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/equipment/${equipment.id}/calibration-history`);
      setHistoryRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch calibration history:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      calibrationDate: '',
      nextCalibrationDate: '',
      certificateNumber: '',
      certifiedBy: '',
      remarks: '',
    });
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let certificatePath = '';

      // Upload certificate if selected
      if (selectedFile) {
        const fileFormData = new FormData();
        fileFormData.append('file', selectedFile);

        // Use the new generic upload endpoint
        const uploadResponse = await api.post('/files/upload-generic', fileFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        certificatePath = uploadResponse.data.path;
      }

      // Add calibration history record (nextCalibrationDate will update equipment's schedule)
      await api.post(`/equipment/${equipment.id}/calibration-history`, {
        ...formData,
        certificatePath,
      });

      onHistoryAdded();
      fetchHistory();
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add calibration history:', error);
      alert('Failed to add calibration history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (historyId: string) => {
    if (!window.confirm('Are you sure you want to delete this calibration record?')) return;

    try {
      await api.delete(`/equipment/calibration-history/${historyId}`);
      fetchHistory();
      onHistoryAdded();
    } catch (error) {
      console.error('Failed to delete calibration history:', error);
      alert('Failed to delete calibration history');
    }
  };

  const handleViewCertificate = (certificatePath: string) => {
    // Extract filename from path (e.g. "uploads/file.pdf" -> "file.pdf")
    const fileName = certificatePath.split('/').pop() || '';
    if (!fileName) return;

    // Use the new generic file serving endpoint
    // Add #toolbar=0 to hide download controls (browser dependent)
    const fileUrl = `${api.defaults.baseURL}/files/uploads/${encodeURIComponent(fileName)}#toolbar=0`;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Calibration History</h2>
            <p className="text-sm text-slate-500 mt-1">
              {equipment.name} ({equipment.equipmentNumber})
            </p>
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
          {/* Add New Record Button */}
          {!showAddForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Add Calibration Record
              </button>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-4">New Calibration Record</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Calibration Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.calibrationDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        let nextDate = '';
                        
                        // Auto-calculate next due date if frequency is available
                        if (newDate && equipment.calibrationFrequency) {
                          const date = new Date(newDate);
                          date.setDate(date.getDate() + equipment.calibrationFrequency);
                          nextDate = date.toISOString().split('T')[0];
                        }
                        
                        setFormData({ 
                          ...formData, 
                          calibrationDate: newDate,
                          nextCalibrationDate: nextDate || formData.nextCalibrationDate 
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Next Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.nextCalibrationDate}
                      onChange={(e) => setFormData({ ...formData, nextCalibrationDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Set manually or auto-filled based on frequency.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Certificate Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.certificateNumber}
                      onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Certificate number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Certified By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.certifiedBy}
                      onChange={(e) => setFormData({ ...formData, certifiedBy: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Company/person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Upload Certificate
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {selectedFile && (
                      <p className="text-xs text-slate-500 mt-1">Selected: {selectedFile.name}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Add Record'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History Records */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Calibration Records</h3>
            
            {loading && historyRecords.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Loading history...</div>
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                No calibration records found
              </div>
            ) : (
              <div className="space-y-3">
                {historyRecords.map((record) => (
                  <div
                    key={record.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {new Date(record.calibrationDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-500">Calibration Date</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{record.certificateNumber}</p>
                            <p className="text-xs text-slate-500">Certificate Number</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-700">{record.certifiedBy}</p>
                            <p className="text-xs text-slate-500">Certified By</p>
                          </div>
                        </div>

                        {record.remarks && (
                          <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                            {record.remarks}
                          </p>
                        )}

                        {record.certificatePath && (
                          <button
                            onClick={() => handleViewCertificate(record.certificatePath!)}
                            className="flex items-center gap-2 mt-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="w-4 h-4" />
                            View Certificate
                          </button>
                        )}

                        <p className="text-xs text-slate-400 mt-2">
                          Uploaded by {record.uploadedBy.firstName} {record.uploadedBy.lastName} on{' '}
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {canModify && (
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
