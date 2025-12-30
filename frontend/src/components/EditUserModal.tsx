import React, { useState, useEffect } from 'react';
import { X, UserCog, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    department: string;
  } | null;
}

export default function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: '',
    jobRoleId: '',
  });
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [jobRoles, setJobRoles] = useState<{ id: string, title: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchJobRoles();
    }
  }, [isOpen]);

  const fetchJobRoles = async () => {
    try {
        const res = await api.get('/competencies/roles');
        setJobRoles(res.data);
    } catch (error) {
        console.error('Failed to fetch job roles', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/settings/departments');
      setDepartmentsList(response.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartmentsList(['HR', 'IT', 'Finance', 'Operations', 'Quality']);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department || '',
        jobRoleId: (user as any).jobRoleId || '', // Cast to any if type def not updated in this file yet
      });
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.put(`/users/${user.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        department: formData.department,
        jobRoleId: formData.jobRoleId || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update user:', err);
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-blue-600" />
            Edit User
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={formData.email}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="compliance_manager">Compliance Manager</option>
                <option value="dept_head">Department Head</option>
                <option value="creator">Creator</option>
                <option value="reviewer">Reviewer</option>
                <option value="viewer">Viewer</option>
                <option value="auditor">Auditor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department
                {['creator', 'reviewer', 'dept_head'].includes(formData.role) && <span className="text-red-500 ml-1">*</span>}
              </label>
              <select
                required={['creator', 'reviewer', 'dept_head'].includes(formData.role)}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {departmentsList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Job Role (Optional)</label>
             <select
                value={formData.jobRoleId}
                onChange={(e) => setFormData({ ...formData, jobRoleId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Role Assigned</option>
                {jobRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.title}</option>
                ))}
              </select>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
