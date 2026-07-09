import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, FileText, LogOut, Search, RefreshCw, HelpCircle } from 'lucide-react';
import api from '../api';
import { generateDeviationPdf } from '../utils/generateDeviationPdf';
import { formatDate } from '../utils/dateFormatter';
import UserGuideModal from '../components/UserGuideModal';

interface Deviation {
  id: string;
  serialNumber: string;
  line: string;
  startDate: string;
  endDate: string;
  totalQuantityProduced: number;
  quantityUnderDeviation: number;
  natureOfDeviation: string;
  detailsOfDeviation: string;
  status: string;
  createdAt: string;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  initiatorName?: string;
}

export default function DeviationDashboard() {
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  const navigate = useNavigate();
  const userString = localStorage.getItem('pd_user');
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    fetchDeviations();
  }, []);

  const fetchDeviations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/product-deviation');
      const data = response.data || [];
      setDeviations(data);
      
      // Calculate simple stats
      const total = data.length;
      const open = data.filter((d: any) => d.status === 'OPEN').length;
      const closed = data.filter((d: any) => d.status === 'CLOSED').length;
      const pending = total - open - closed;
      setStats({ total, open, closed, pending });
    } catch (err) {
      console.error('Failed to fetch deviations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pd_token');
    localStorage.removeItem('pd_user');
    navigate('/login');
  };

  const filteredDeviations = deviations.filter((dev) => {
    const serialNumber = dev.serialNumber || '';
    const line = dev.line || '';
    const natureOfDeviation = dev.natureOfDeviation || '';
    const firstName = dev.createdBy?.firstName || '';
    const lastName = dev.createdBy?.lastName || '';
    const creatorName = `${firstName} ${lastName}`.trim();
    const initiatorName = dev.initiatorName || '';

    const matchesSearch = 
      serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.toLowerCase().includes(searchTerm.toLowerCase()) ||
      natureOfDeviation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      initiatorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && dev.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/85 sticky top-0 z-40 shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Borosil Logo" className="h-10 w-auto object-contain" />
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">Product Deviation Portal</h1>
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-sans">Integrated Document Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsGuideOpen(true)}
              className="h-11 px-4 bg-slate-100/50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 rounded-xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shrink-0 hover:scale-102 active:scale-98"
              title="User Guide"
            >
              <HelpCircle className="w-4 h-4 text-orange-500" />
              <span>User Guide</span>
            </button>

            {user && (
              <div className="hidden md:flex items-center gap-2 px-3.5 h-11 bg-slate-100/50 rounded-xl border border-slate-200/80 shrink-0 shadow-sm">
                <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs">
                  {user.firstName[0]}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {user.role} {user.department ? `| ${user.department}` : ''}
                  </div>
                </div>
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className="h-11 px-4 bg-slate-100/50 hover:bg-red-50 text-slate-650 hover:text-red-650 rounded-xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shrink-0 hover:scale-102 active:scale-98"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Dashboard metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between relative overflow-hidden group hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 min-h-[110px]">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block relative z-10">Total Deviations</span>
            <div className="flex items-baseline justify-between mt-2 relative z-10">
              <span className="text-3xl font-black text-slate-800">{stats.total}</span>
              <span className="p-1 px-2 text-[9px] font-bold bg-slate-100 text-slate-600 rounded-lg">All time</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between relative overflow-hidden group hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 min-h-[110px]">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block relative z-10">Active (Open)</span>
            <div className="flex items-baseline justify-between mt-2 relative z-10">
              <span className="text-3xl font-black text-rose-600">{stats.open}</span>
              <span className="p-1 px-2 text-[9px] font-bold bg-rose-50 text-rose-600 rounded-lg">Requires action</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between relative overflow-hidden group hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 min-h-[110px]">
            <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest block relative z-10">Pending Approval</span>
            <div className="flex items-baseline justify-between mt-2 relative z-10">
              <span className="text-3xl font-black text-amber-600">{stats.pending}</span>
              <span className="p-1 px-2 text-[9px] font-bold bg-amber-50 text-amber-600 rounded-lg">In workflow</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between relative overflow-hidden group hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 min-h-[110px]">
            <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest block relative z-10">Closed Deviations</span>
            <div className="flex items-baseline justify-between mt-2 relative z-10">
              <span className="text-3xl font-black text-emerald-600">{stats.closed}</span>
              <span className="p-1 px-2 text-[9px] font-bold bg-emerald-50 text-emerald-600 rounded-lg">Archived</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </section>

        {/* Action and Filtering Row */}
        <section className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
              <input
                type="text"
                placeholder="Search by Sr No, Line, Nature, Creator..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200/85 focus:border-orange-500 focus:bg-white rounded-xl outline-none transition-all font-medium text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              className="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200/85 focus:border-orange-500 focus:bg-white rounded-xl outline-none font-medium text-slate-650 transition-all"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="PENDING_MARKETING">Pending Marketing</option>
              <option value="PENDING_PLANT_HEAD">Pending Plant Head</option>
              <option value="PENDING_QUALITY_HEAD">Pending Quality Head</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDeviations}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => navigate('/new-deviation')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 font-bold text-sm cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4" />
              New Deviation
            </button>
          </div>
        </section>

        {/* Deviations List Table */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50/70 text-slate-500 uppercase text-[9px] font-bold tracking-widest border-b border-slate-200/80">
                <tr>
                  <th className="py-4 px-6">Sr No. / Line</th>
                  <th className="py-4 px-6">Nature of Deviation</th>
                  <th className="py-4 px-6">Created By</th>
                  <th className="py-4 px-6">Initiator Name</th>
                  <th className="py-4 px-6">Created On</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredDeviations.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-850">
                      <div>{dev.serialNumber}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Line: {dev.line}</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-650 max-w-xs truncate" title={dev.natureOfDeviation}>
                      {dev.natureOfDeviation}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-500">
                      {dev.createdBy?.firstName} {dev.createdBy?.lastName}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-700">
                      {dev.initiatorName || 'N/A'}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-400 text-xs">
                      {formatDate(dev.createdAt)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                        dev.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 border border-emerald-100' :
                        dev.status === 'OPEN' ? 'bg-rose-50 text-rose-700 ring-rose-600/10 border border-rose-100' :
                        'bg-amber-50 text-amber-800 ring-amber-600/10 border border-amber-100'
                      }`}>
                        {dev.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {dev.status === 'CLOSED' && (
                          <button
                            onClick={() => generateDeviationPdf(dev)}
                            className="text-emerald-700 hover:text-white font-bold flex items-center gap-1.5 transition-all bg-emerald-50 hover:bg-emerald-600 px-3 py-2 rounded-xl text-xs cursor-pointer border border-emerald-150 shadow-sm hover:shadow-md active:scale-95"
                            title="Download PDF Report"
                          >
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/deviation/${dev.id}`)}
                          className="text-blue-700 hover:text-white font-bold flex items-center gap-1.5 transition-all bg-blue-50 hover:bg-blue-600 px-3 py-2 rounded-xl text-xs cursor-pointer border border-blue-150 shadow-sm hover:shadow-md active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredDeviations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
                          <span>Loading deviations...</span>
                        </div>
                      ) : (
                        'No product deviations found.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-8 text-center text-slate-400 text-[10px] tracking-widest uppercase">
        &copy; 2026 Borosil Renewables Ltd. All Rights Reserved.
      </footer>

      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
