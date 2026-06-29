import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Search, ChevronDown, UploadCloud, FileText, Trash2, Download } from 'lucide-react';

const classifications = ['Man', 'Machine', 'Material', 'Method', 'Other'];

const Section1BasicInfo = ({ data, update, readOnly }: any) => {
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData = reader.result as string;
        update((prev: any) => ({
          ...prev,
          attachments: [
            ...(prev.attachments || []),
            { name: file.name, fileData }
          ]
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    update((prev: any) => ({
      ...prev,
      attachments: prev.attachments.filter((_: any, idx: number) => idx !== index)
    }));
  };

  const downloadAttachment = (file: { name: string; fileData: string }) => {
    const link = document.createElement('a');
    link.href = file.fileData;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        setUsersList(response.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (data.hodName) {
      setSearchTerm(data.hodName);
    } else {
      setSearchTerm('');
    }
  }, [data.hodName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(data.hodName || '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [data.hodName]);

  const filteredUsers = usersList.filter(user => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const dept = (user.department || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || dept.includes(query) || email.includes(query);
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/settings/departments');
        setDepartmentsList(response.data || []);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        // Fallback to basic list if API fails
        setDepartmentsList(['Production', 'Quality', 'Maintenance', 'EHS']);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!data.requisitionByName) {
      let initialName = '';
      if (data.requisitionBy) {
        if (typeof data.requisitionBy === 'object') {
          initialName = `${data.requisitionBy.firstName || ''} ${data.requisitionBy.lastName || ''}`.trim() || data.requisitionBy.name || '';
        } else if (typeof data.requisitionBy === 'string' && data.requisitionBy !== '[object Object]') {
          initialName = data.requisitionBy;
        }
      }
      
      if (!initialName) {
        try {
          const userStr = localStorage.getItem('moc_user');
          if (userStr) {
            const user = JSON.parse(userStr);
            initialName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '';
          }
        } catch (e) {
          console.error('Failed to parse user for requisitionByName:', e);
        }
      }

      if (initialName) {
        update((prev: any) => ({ ...prev, requisitionByName: initialName }));
      }
    }
  }, [data.requisitionByName, data.requisitionBy, update]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    update((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleClassification = (item: string) => {
    if (readOnly) return;
    const current = data.classification || [];
    const updated = current.includes(item) 
      ? current.filter((i: any) => i !== item)
      : [...current, item];
    update((prev: any) => ({ ...prev, classification: updated }));
  };

  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Requisition By</label>
          <input 
            type="text" 
            name="requisitionByName"
            value={data.requisitionByName || ''}
            onChange={handleChange}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            placeholder="Enter Requisitioner Name"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
          <select 
            name="department"
            value={data.department || ''}
            onChange={handleChange}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          >
            <option value="">Select Department</option>
            {departmentsList.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Request Date</label>
          <input 
            type="date" 
            name="requestDate"
            value={data.requestDate || ''}
            onChange={handleChange}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">MOC Mode</label>
          <select 
            name="mocMode"
            value={data.mocMode || ''}
            onChange={handleChange}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all bg-white"
          >
            <option value="">Select Mode</option>
            <option value="Trial">Trial</option>
            <option value="Production">Production</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Product / Process</label>
          <input 
            type="text" 
            name="productProcess"
            value={data.productProcess || ''}
            onChange={handleChange}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
            placeholder="e.g. Line 1 Assembly"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Classification</label>
        <div className="flex flex-wrap gap-3">
          {classifications.map(item => (
            <label key={item} className="flex items-center space-x-1.5 cursor-pointer group">
              <div 
                onClick={() => handleClassification(item)}
                className={`w-4 h-4 rounded text-xs border-2 flex items-center justify-center transition-all ${
                  data.classification?.includes(item) 
                    ? 'bg-brand-500 border-brand-500 text-white' 
                    : 'border-slate-300 group-hover:border-brand-500'
                }`}
              >
                {data.classification?.includes(item) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <span className="text-sm text-slate-600 font-medium">{item}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Description of Change</label>
        <textarea 
          name="description"
          value={data.description || ''}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          placeholder="Describe what is being changed..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Current Status</label>
          <textarea 
            name="currentStatus"
            value={data.currentStatus || ''}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Changes Required</label>
          <textarea 
            name="changesRequired"
            value={data.changesRequired || ''}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Change</label>
          <textarea 
            name="reasonForChange"
            value={data.reasonForChange || ''}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          />
        </div>
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-slate-700 mb-1">HOD Name for Approval</label>
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (readOnly) return;
                setIsOpen(true);
                if (data.hodName && searchTerm === data.hodName) {
                  setSearchTerm('');
                }
              }}
              placeholder="Search & select HOD..."
              className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all bg-white"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && setIsOpen(!isOpen)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-50 animate-in fade-in slide-in-from-top-1 duration-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '';
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        update((prev: any) => ({ ...prev, hodName: fullName }));
                        setSearchTerm(fullName);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex flex-col justify-center gap-0.5"
                    >
                      <span className="text-sm font-semibold text-slate-800">{fullName}</span>
                      {user.department && (
                        <span className="text-[10px] text-slate-400 font-medium">{user.department} Department</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-xs text-slate-400 text-center font-medium">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <label className="block text-xs font-semibold text-slate-700 mb-2">Supporting Attachments</label>
        
        {/* Upload Button/Zone */}
        {!readOnly && (
          <label className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-brand-50/5 transition-all cursor-pointer group mb-4">
            <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-brand-500 transition-colors mb-2" />
            <span className="text-xs font-bold text-slate-700">Click to upload files</span>
            <span className="text-[10px] text-slate-400 font-medium mt-1">Upload drawings, specifications, risk assessments, etc.</span>
            <input 
              type="file" 
              multiple 
              className="hidden" 
              onChange={handleAttachmentUpload} 
            />
          </label>
        )}

        {/* Attachments List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.attachments && data.attachments.length > 0 ? (
            data.attachments.map((file: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>{file.name}</p>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(file)}
                      className="text-[10px] font-bold text-brand-600 hover:text-brand-700 hover:underline mt-0.5 block flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Download file
                    </button>
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-4 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-slate-200">
              No attachments uploaded
            </div>
          )}
        </div>
      </div>

      </div>
    </fieldset>
  );
};

export default Section1BasicInfo;
