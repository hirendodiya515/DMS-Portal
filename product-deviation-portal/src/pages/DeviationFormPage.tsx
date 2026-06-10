import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertCircle, FileWarning, Search } from 'lucide-react';
import api from '../api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function DeviationFormPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [lineOptions, setLineOptions] = useState<string[]>(['Line 1', 'Line 2', 'Line 3']);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    line: '',
    startDate: '',
    endDate: '',
    totalQuantityProduced: 0,
    quantityUnderDeviation: 0,
    natureOfDeviation: '',
    detailsOfDeviation: '',
    responsiblePersonIds: [] as string[]
  });

  useEffect(() => {
    fetchFormContext();
  }, []);

  const fetchFormContext = async () => {
    setLoading(true);
    try {
      const [usersRes, linesRes] = await Promise.all([
        api.get('/users'),
        api.get('/settings/product_deviation_lines').catch(() => ({ data: '' }))
      ]);
      
      setUsers(usersRes.data || []);
      if (linesRes.data) {
        const lines = linesRes.data
          .split('\n')
          .map((l: string) => l.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          setLineOptions(lines);
        }
      }
    } catch (err) {
      console.error('Failed to load form context data:', err);
      setError('Could not load department users or lines. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (userId: string) => {
    setFormData((prev) => {
      const current = prev.responsiblePersonIds;
      if (current.includes(userId)) {
        return {
          ...prev,
          responsiblePersonIds: current.filter((id) => id !== userId)
        };
      } else {
        if (current.length >= 3) {
          alert('You can select a maximum of 3 responsible persons.');
          return prev;
        }
        return {
          ...prev,
          responsiblePersonIds: [...current, userId]
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.line) {
      setError('Please select a production line.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Please select start and end dates.');
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('Start Date cannot be after End Date.');
      return;
    }
    if (formData.totalQuantityProduced <= 0) {
      setError('Total quantity produced must be greater than zero.');
      return;
    }
    if (formData.quantityUnderDeviation < 0) {
      setError('Quantity under deviation cannot be negative.');
      return;
    }
    if (formData.quantityUnderDeviation > formData.totalQuantityProduced) {
      setError('Quantity under deviation cannot exceed total quantity produced.');
      return;
    }
    if (!formData.natureOfDeviation.trim()) {
      setError('Please specify the nature of deviation.');
      return;
    }
    if (formData.responsiblePersonIds.length === 0) {
      setError('Please select at least 1 responsible person.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/product-deviation', {
        ...formData,
        totalQuantityProduced: Number(formData.totalQuantityProduced),
        quantityUnderDeviation: Number(formData.quantityUnderDeviation)
      });
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred while creating the product deviation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all border border-slate-100 cursor-pointer mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img src="/logo.png" alt="Borosil Logo" className="h-10 w-auto object-contain" />
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight">Create Product Deviation</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Product Deviation Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-8 flex-1 w-full">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading form options...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <FileWarning className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">New Product Deviation Record</h2>
                <p className="text-xs text-orange-100">Ensure all details are accurate. Responsible persons will receive notifications to provide containment and corrective actions.</p>
              </div>
            </div>

            {error && (
              <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm font-medium">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Production Line *</label>
                  <select
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700"
                    value={formData.line}
                    onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                    required
                  >
                    <option value="">Select line...</option>
                    {lineOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Start Date *</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm bg-slate-55 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">End Date *</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm bg-slate-55 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Total Quantity Produced (sqm) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700"
                    placeholder="e.g. 5000"
                    value={formData.totalQuantityProduced || ''}
                    onChange={(e) => setFormData({ ...formData, totalQuantityProduced: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Quantity Under Deviation (sqm) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700"
                    placeholder="e.g. 250"
                    value={formData.quantityUnderDeviation || ''}
                    onChange={(e) => setFormData({ ...formData, quantityUnderDeviation: Number(e.target.value) })}
                    min="0"
                    required
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nature of Deviation *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700"
                    placeholder="Short description of physical/technical deviation..."
                    value={formData.natureOfDeviation}
                    onChange={(e) => setFormData({ ...formData, natureOfDeviation: e.target.value })}
                    required
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Detailed description *</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-700 resize-none"
                    placeholder="Provide detailed breakdown and justification for the product deviation..."
                    value={formData.detailsOfDeviation}
                    onChange={(e) => setFormData({ ...formData, detailsOfDeviation: e.target.value })}
                    required
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Assign Responsible Persons (Max 3) *</label>
                  <p className="text-[11px] text-slate-400 font-medium mb-3 ml-1">Select the operators/engineers responsible for defining root cause, containment, and corrective actions.</p>
                  
                  {formData.responsiblePersonIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.responsiblePersonIds.map((id) => {
                        const targetUser = users.find(u => u.id === id);
                        if (!targetUser) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
                            {targetUser.firstName} {targetUser.lastName}
                            <button
                              type="button"
                              onClick={() => handleCheckboxChange(id)}
                              className="text-orange-400 hover:text-orange-600 transition-colors ml-1 font-bold text-sm cursor-pointer"
                            >
                              &times;
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type to search users by name or email..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-100 focus:border-orange-500 rounded-xl outline-none font-medium"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto custom-scrollbar p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                    {users.filter((u) => {
                      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                      const email = (u.email || '').toLowerCase();
                      return fullName.includes(userSearchTerm.toLowerCase()) || email.includes(userSearchTerm.toLowerCase());
                    }).map((u) => {
                      const isSelected = formData.responsiblePersonIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleCheckboxChange(u.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-white border-orange-500 shadow-sm ring-1 ring-orange-400'
                              : 'bg-white border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-orange-600 focus:ring-orange-500"
                            checked={isSelected}
                            readOnly
                          />
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-800">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-[9px] text-slate-400 font-semibold truncate max-w-[140px]">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {users.filter((u) => {
                      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                      const email = (u.email || '').toLowerCase();
                      return fullName.includes(userSearchTerm.toLowerCase()) || email.includes(userSearchTerm.toLowerCase());
                    }).length === 0 && (
                      <div className="col-span-1 sm:col-span-2 md:col-span-3 text-center py-6 text-slate-400 font-semibold text-xs">
                        No matching users found.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Create Deviation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-8 text-center text-slate-400 text-[10px] tracking-widest uppercase">
        &copy; 2026 Borosil Renewables Ltd. All Rights Reserved.
      </footer>
    </div>
  );
}
