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
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-200">
              <Lock className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Product Deviation Portal</h1>
            <p className="text-sm text-slate-400 font-medium font-sans">Deviation Tracking & Approvals</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-md shadow-orange-200 flex items-center justify-center cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-50 text-center">
            <p className="text-xs text-slate-400">
              Part of the Integrated Document Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
