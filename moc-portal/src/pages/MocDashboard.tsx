import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, CheckCircle, FileText, Search, LogOut, HelpCircle } from 'lucide-react';
import api from '../api';

const MocDashboard = () => {
  const navigate = useNavigate();
  const [mocs, setMocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('moc_user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.error('Failed to parse user info:', e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('moc_token');
    localStorage.removeItem('moc_user');
    navigate('/login');
  };

  useEffect(() => {
    const fetchMocs = async () => {
      try {
        const res = await api.get('/moc');
        setMocs(res.data || []);
      } catch (err) {
        console.error('Failed to fetch MOCs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMocs();
  }, []);

  const totalCount = mocs.length;
  const pendingCount = mocs.filter(m => m.status && m.status.toLowerCase().includes('pending')).length;
  const approvedCount = mocs.filter(m => m.status === 'Approved' || m.status === 'Finalized' || m.status === 'Closed').length;
  const closedCount = mocs.filter(m => m.status === 'Finalized' || m.status === 'Closed').length;

  const filteredMocs = mocs.filter(moc => {
    const query = searchQuery.toLowerCase();
    const mocNo = (moc.mocNo || '').toLowerCase();
    const process = (moc.productProcess || '').toLowerCase();
    
    let requisitioner = moc.requisitionByName || '';
    if (!requisitioner && moc.requisitionBy) {
      if (typeof moc.requisitionBy === 'object') {
        requisitioner = `${moc.requisitionBy.firstName || ''} ${moc.requisitionBy.lastName || ''}`.trim() || moc.requisitionBy.name || '';
      } else {
        requisitioner = String(moc.requisitionBy);
      }
    }
    
    const status = (moc.status || '').toLowerCase();
    
    return mocNo.includes(query) || 
           process.includes(query) || 
           requisitioner.toLowerCase().includes(query) || 
           status.includes(query);
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700';
      case 'Pending HOD':
        return 'bg-amber-100 text-amber-700';
      case 'Pending QC Head':
        return 'bg-amber-100 text-amber-700';
      case 'Pending Plant Head':
        return 'bg-amber-100 text-amber-700';
      case 'Pending CEO':
        return 'bg-purple-100 text-purple-700';
      case 'Pending EHS':
        return 'bg-blue-100 text-blue-700';
      case 'Pending QA':
        return 'bg-blue-100 text-blue-700';
      case 'Finalized':
      case 'Closed':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">MOC Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Manage process changes and approvals</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/MOC-guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-2 text-slate-500 hover:text-brand-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm cursor-pointer"
            title="MOC User Guide"
          >
            <HelpCircle className="w-5 h-5" />
          </a>

          <button 
            onClick={() => navigate('/new-moc')}
            className="flex items-center px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-md shadow-brand-200 group"
          >
            <Plus className="w-4 h-4 mr-1.5 group-hover:rotate-90 transition-transform" />
            Create New MOC
          </button>

          {currentUser && (
            <div className="relative group">
              <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-100 uppercase">
                  {currentUser.firstName?.[0] || currentUser.name?.[0] || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-none">
                    {`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || 'User'}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                    {currentUser.role || 'Operator'}
                  </div>
                </div>
              </button>
              
              {/* Profile Hover Popover */}
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-3 space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <p className="text-xs font-bold text-slate-800">
                    {`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                    {currentUser.email}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg font-bold transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out / Switch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total MOCs', count: totalCount, icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Pending Approval', count: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', count: approvedCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Closed/Synced', count: closedCount, icon: CheckCircle, color: 'text-brand-600', bg: 'bg-brand-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mr-4 shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 leading-tight">{stat.count}</div>
              <div className="text-xs font-medium text-slate-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent MOCs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-800">Recent Applications</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search MOCs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 rounded-lg border-none text-xs outline-none focus:ring-2 focus:ring-brand-500 transition-all w-48"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">MOC No</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Process</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requester</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading applications...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    No applications found
                  </td>
                </tr>
              ) : (
                filteredMocs.map((moc) => {
                  let requisitioner = moc.requisitionByName || 'N/A';
                  if (requisitioner === 'N/A' && moc.requisitionBy) {
                    if (typeof moc.requisitionBy === 'object') {
                      requisitioner = `${moc.requisitionBy.firstName || ''} ${moc.requisitionBy.lastName || ''}`.trim() || moc.requisitionBy.name || 'N/A';
                    } else {
                      requisitioner = String(moc.requisitionBy);
                    }
                  }
                  return (
                    <tr 
                      key={moc.id} 
                      onClick={() => navigate(`/edit-moc/${moc.id}`)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group text-sm"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{moc.mocNo}</td>
                      <td className="px-4 py-3">
                        {moc.mocMode ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            moc.mocMode === 'Trial' 
                              ? 'bg-blue-50 text-blue-700 border-blue-100' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {moc.mocMode}
                          </span>
                        ) : (
                          <span className="text-slate-350 italic text-[10px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{moc.productProcess || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-500">{requisitioner}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(moc.status)}`}>
                          {moc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => navigate(`/edit-moc/${moc.id}`)}
                          className="text-xs font-bold text-brand-600 hover:underline"
                        >
                          Edit/View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MocDashboard;
