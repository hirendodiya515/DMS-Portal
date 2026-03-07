import React, { useState } from 'react';
import { X, Lock, Mail, Building, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await api.put('/auth/change-password', {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });
      
      setSuccess(true);
      // Log out after 2 seconds
      setTimeout(() => {
        logout();
        navigate('/login');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setError(err.response?.data?.message || 'Failed to change password. Please check your old password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="relative h-28 flex-shrink-0 bg-gradient-to-br from-blue-600 to-cyan-500">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute -bottom-8 left-6">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center p-1">
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-10 p-6 custom-scrollbar">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-800">{user?.firstName} {user?.lastName}</h2>
            <p className="text-slate-500 flex items-center gap-1.5 mt-0.5 text-sm">
              <Shield className="w-4 h-4" />
              <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
            </p>
          </div>

          {!success ? (
            <div className="space-y-4">
              {/* Ghost Mode: User Details */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Email Address</p>
                    <p className="text-sm text-slate-700 font-medium truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Department</p>
                    <p className="text-sm text-slate-700 font-medium">{user?.department || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Editable Mode: Change Password */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Update Password
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-3">
                  {error && (
                    <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg border border-red-100 animate-shake">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={formData.oldPassword}
                      onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Confirm New</label>
                      <input
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Password Updated!</h3>
              <p className="text-sm text-slate-500">Security credentials updated. Logging you out for safety...</p>
              <div className="mt-4 flex justify-center">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
