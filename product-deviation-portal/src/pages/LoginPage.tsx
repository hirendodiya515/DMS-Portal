import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import api from '../api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('pd_token', response.data.accessToken);
      localStorage.setItem('pd_user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-soft p-6 border border-slate-200/80 hover:shadow-premium transition-all duration-300">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
              <Lock className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Product Deviation Portal</h1>
            <p className="text-xs text-slate-450 font-bold uppercase tracking-wider mt-1">Deviation Tracking & Approvals</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-655 text-sm font-semibold">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-medium text-slate-700"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-455" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-medium text-slate-700"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Part of the Integrated Document Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
