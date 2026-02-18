import { useState, useEffect } from 'react';
import { Plus, Search, ArrowLeft, Eye, History, Edit, Trash2, Wrench, Calendar as CalendarIcon } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import AddEditEquipmentModal from '../components/calibration/AddEditEquipmentModal';
import EquipmentDetailModal from '../components/calibration/EquipmentDetailModal';
import CalibrationHistoryModal from '../components/calibration/CalibrationHistoryModal';
import CalibrationCalendarModal from '../components/calibration/CalibrationCalendarModal';

interface Equipment {
  id: string;
  equipmentNumber: string;
  name: string;
  equipmentId: string;
  make: string;
  model: string;
  line: string;
  location: string;
  department: string;
  purchaseDate: string;
  lastCalibrationDate: string;
  nextCalibrationDate: string;
  calibrationFrequency: number;
  status: 'active' | 'maintenance' | 'inactive';
  remark: string;
  alertDaysBeforeDue: number;
  createdBy: any;
}

interface DashboardData {
  totalEquipment: number;
  calibrationOk: number;
  calibrationDue: number;
  calibrationUpcoming: number;
  departmentSummary: Array<{ department: string; count: number }>;
  upcomingCalibrations: Array<{
    week: number;
    count: number;
    equipment: Array<{ id: string; name: string; department: string; nextCalibrationDate: string }>;
  }>;
  allCalibrations: Array<{
    id: string;
    name: string;
    department: string;
    nextCalibrationDate: string;
    status: 'OK' | 'DUE' | 'UPCOMING';
  }>;
}

export default function CalibrationEquipmentPage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const checkAccess = (equipmentDepartment?: string) => {
    if (user?.role === 'admin') return true;
    if (user?.role !== 'creator' && user?.role !== 'reviewer') return false;
    
    // If equipmentDepartment is provided, check if it matches user's department
    if (equipmentDepartment) {
      return user?.department === equipmentDepartment;
    }
    
    // For general actions like "Add Equipment", being a creator/reviewer is enough
    return true;
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchEquipmentByDepartment(selectedDepartment);
    }
  }, [selectedDepartment]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/equipment/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipmentByDepartment = async (department: string) => {
    try {
      const response = await api.get('/equipment', { params: { department } });
      setEquipmentList(response.data);
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
    }
  };

  const getCalibrationStatus = (nextDate: string, alertDays: number = 7) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDue = new Date(nextDate);
    nextDue.setHours(0, 0, 0, 0);

    if (nextDue < today) return 'due';
    
    const alertDate = new Date(nextDue);
    alertDate.setDate(alertDate.getDate() - alertDays);
    
    if (today >= alertDate && today < nextDue) return 'upcoming';
    return 'ok';
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) return;
    
    try {
      await api.delete(`/equipment/${id}`);
      if (selectedDepartment) {
        fetchEquipmentByDepartment(selectedDepartment);
      }
      fetchDashboard();
    } catch (error) {
      console.error('Failed to delete equipment:', error);
      alert('Failed to delete equipment');
    }
  };

  const handleSaveEquipment = () => {
    if (selectedDepartment) {
      fetchEquipmentByDepartment(selectedDepartment);
    }
    fetchDashboard();
    setIsAddEditModalOpen(false);
    setSelectedEquipment(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading calibration data...</div>;
  }

  // Department View
  if (!selectedDepartment) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-7 h-7 text-blue-600" />
              Calibration & Equipment
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage equipment and track calibration schedules</p>
          </div>
          {checkAccess() && (
            <button
              onClick={() => {
                setSelectedEquipment(null);
                setIsAddEditModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Equipment
            </button>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Equipment</p>
                <p className="text-2xl font-bold text-slate-800">{dashboardData?.totalEquipment || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Calibration OK</p>
                <p className="text-2xl font-bold text-green-600">{dashboardData?.calibrationOk || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Calibration Due</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData?.calibrationDue || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Upcoming</p>
                <p className="text-2xl font-bold text-yellow-600">{dashboardData?.calibrationUpcoming || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Calibrations Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weekly Summary (Left) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Upcoming Calibrations (Next 4 Weeks)</h2>
            <div className="grid grid-cols-4 gap-4">
              {dashboardData?.upcomingCalibrations.map((week) => (
                <div key={week.week} className="text-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1 font-medium">Week {week.week}</p>
                    <p className="text-2xl font-bold text-blue-600">{week.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Preview (Right) */}
          <div 
            onClick={() => setIsCalendarModalOpen(true)}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">Calendar View</h2>
                <p className="text-sm text-slate-500 mt-1">
                  View full calibration schedule by month
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <CalendarIcon className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white
                    ${i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-green-400' : 'bg-purple-400'}
                  `}>
                    {i}
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium text-slate-600">
                {dashboardData?.totalEquipment || 0} active schedules
              </span>
            </div>
            
            <button className="mt-4 w-full py-2 bg-slate-50 text-slate-600 text-sm font-medium rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              Open Full Calendar
            </button>
          </div>
        </div>

        {/* Department Cards */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Departments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dashboardData?.departmentSummary.map((dept) => (
              <button
                key={dept.department}
                onClick={() => setSelectedDepartment(dept.department)}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{dept.department}</h3>
                    <p className="text-sm text-slate-500 mt-1">{dept.count} equipment</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Modals */}
        {isAddEditModalOpen && (
          <AddEditEquipmentModal
            isOpen={isAddEditModalOpen}
            onClose={() => {
              setIsAddEditModalOpen(false);
              setSelectedEquipment(null);
            }}
            onSave={handleSaveEquipment}
            equipment={selectedEquipment}
          />
        )}

        {dashboardData && (
          <CalibrationCalendarModal
            isOpen={isCalendarModalOpen}
            onClose={() => setIsCalendarModalOpen(false)}
            calibrations={dashboardData.allCalibrations}
          />
        )}
      </div>
    );
  }

  // Equipment List View
  const filteredEquipment = equipmentList.filter((eq) =>
    eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.equipmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.make.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedDepartment(null)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{selectedDepartment} Equipment</h1>
            <p className="text-slate-500 text-sm mt-1">{equipmentList.length} total equipment</p>
          </div>
        </div>
        {checkAccess(selectedDepartment || undefined) && (
          <button
            onClick={() => {
              setSelectedEquipment(null);
              setIsAddEditModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Add Equipment
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search equipment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Equipment Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Sr.</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Equipment Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Make</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Line</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Next Due</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEquipment.map((equipment, index) => {
                const calibStatus = getCalibrationStatus(equipment.nextCalibrationDate, equipment.alertDaysBeforeDue);
                return (
                  <tr key={equipment.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{equipment.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{equipment.make}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{equipment.line || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{equipment.equipmentId}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(equipment.nextCalibrationDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          calibStatus === 'ok'
                            ? 'bg-green-100 text-green-700'
                            : calibStatus === 'upcoming'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {calibStatus === 'ok' ? 'OK' : calibStatus === 'upcoming' ? 'Upcoming' : 'Due'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedEquipment(equipment);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEquipment(equipment);
                            setIsHistoryModalOpen(true);
                          }}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Calibration History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {checkAccess(equipment.department) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedEquipment(equipment);
                                setIsAddEditModalOpen(true);
                              }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(equipment.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredEquipment.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No equipment found
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isAddEditModalOpen && (
        <AddEditEquipmentModal
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setSelectedEquipment(null);
          }}
          onSave={handleSaveEquipment}
          equipment={selectedEquipment}
        />
      )}

      {isDetailModalOpen && selectedEquipment && (
        <EquipmentDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedEquipment(null);
          }}
          equipment={selectedEquipment}
        />
      )}

      {isHistoryModalOpen && selectedEquipment && (
        <CalibrationHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedEquipment(null);
          }}
          equipment={selectedEquipment}
          onHistoryAdded={() => {
            if (selectedDepartment) {
              fetchEquipmentByDepartment(selectedDepartment);
            }
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}
