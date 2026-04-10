import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { X, Save, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deviationId: string | null;
  isNew: boolean;
}

export function DeviationDetailsModal({ isOpen, onClose, deviationId, isNew }: Props) {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [deviation, setDeviation] = useState<any>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Form states for NEW deviation
  const [formData, setFormData] = useState({
    line: '',
    startDate: '',
    endDate: '',
    parameterUnderDeviation: '',
    parameterSpecification: '',
    natureOfDeviation: '',
    detailsOfDeviation: '',
    department: '',
    responsiblePersonIds: [] as string[]
  });

  // Action states for Responsibles
  const [actionData, setActionData] = useState({
    rootCauseAnalysis: '',
    containmentAction: '',
    correctiveAction: ''
  });

  // Step remarks
  const [stepRemark, setStepRemark] = useState('');
  
  // Settings context
  const [qaHeadConfigId, setQAHeadConfigId] = useState<string | null>(null);
  const [plantHeadConfigId, setPlantHeadConfigId] = useState<string | null>(null);
  const [processHeadConfigId, setProcessHeadConfigId] = useState<string | null>(null);
  const [ceoConfigId, setCEOConfigId] = useState<string | null>(null);
  const [lineOptions, setLineOptions] = useState<string[]>(['Line 1', 'Line 2', 'Line 3']);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchDepartments();
      fetchSettings();
      if (!isNew && deviationId) fetchDeviationDetails();
    }
  }, [isOpen, deviationId, isNew]);

  const fetchSettings = async () => {
    try {
      const [qaRes, phRes, prRes, ceoRes, lRes] = await Promise.all([
        api.get('/settings/process_deviation_qa_head'),
        api.get('/settings/process_deviation_plant_head'),
        api.get('/settings/process_deviation_process_head'),
        api.get('/settings/process_deviation_ceo'),
        api.get('/settings/process_deviation_lines')
      ]);
      setQAHeadConfigId(qaRes.data);
      setPlantHeadConfigId(phRes.data);
      setProcessHeadConfigId(prRes.data);
      setCEOConfigId(ceoRes.data);
      if (lRes.data) {
        setLineOptions(lRes.data.split('\n').map((l: string) => l.trim()).filter(Boolean));
      }
    } catch (err) { }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) { }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/settings/departments');
      setDepartments(data || ['HR', 'IT', 'Finance', 'Operations', 'Quality']);
    } catch (err) { }
  };

  const fetchDeviationDetails = async () => {
    try {
      const { data } = await api.get(`/process-deviation/${deviationId}`);
      setDeviation(data);
      setActionData({
        rootCauseAnalysis: data.rootCauseAnalysis || '',
        containmentAction: data.containmentAction || '',
        correctiveAction: data.correctiveAction || ''
      });
      setStepRemark('');
    } catch (err) { }
  };

  const handleCreate = async () => {
    if (!formData.department) {
      alert('Please select a department.');
      return;
    }
    if (formData.responsiblePersonIds.length === 0 || formData.responsiblePersonIds.length > 3) {
      alert('Please select between 1 and 3 responsible persons.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/process-deviation', formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error creating deviation');
    } finally {
      setLoading(false);
    }
  };

  const handleActionSign = async () => {
    setLoading(true);
    try {
      await api.put(`/process-deviation/${deviationId}/action-plan`, actionData);
      fetchDeviationDetails();
    } catch (err) {
      console.error(err);
      alert('Error saving action plan');
    } finally {
      setLoading(false);
    }
  };

  const handleStepApprove = async (step: string) => {
    setLoading(true);
    try {
      await api.put(`/process-deviation/${deviationId}/approve-${step}`, { remarks: stepRemark });
      fetchDeviationDetails();
    } catch (err) {
      console.error(err);
      alert(`Error approving ${step}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isResponsiblePerson = deviation?.responsiblePersons?.some((rp: any) => rp.userId === user?.id);
  const hasSignedAsResponsible = deviation?.responsiblePersons?.find((rp: any) => rp.userId === user?.id)?.signedAt;
  
  // Workflow roles
  const isFunctionalHead = user?.department === deviation?.department && user?.role === 'dept_head';
  const isQAHead = qaHeadConfigId ? user?.id === qaHeadConfigId : user?.role === 'admin';
  const isPlantHead = plantHeadConfigId ? user?.id === plantHeadConfigId : user?.role === 'admin';
  const isProcessHead = processHeadConfigId ? user?.id === processHeadConfigId : user?.role === 'admin';
  const isCEO = ceoConfigId ? user?.id === ceoConfigId : user?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800" id="modal-title">
            {isNew ? 'Create Process Deviation' : `Deviation Details: ${deviation?.serialNumber || ''}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
            <span className="sr-only">Close</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {isNew ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  <option value="">Select Department...</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Line</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.line} onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                >
                  <option value="">Select Line...</option>
                  {lineOptions.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Parameter Under Deviation</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type process parameter here.. i.e. Hotspot"
                  value={formData.parameterUnderDeviation} onChange={(e) => setFormData({ ...formData, parameterUnderDeviation: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Specification of Parameter</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type specification of parameter here.. i.e. > 1500 degree"
                  value={formData.parameterSpecification} onChange={(e) => setFormData({ ...formData, parameterSpecification: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nature of Deviation</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.natureOfDeviation} onChange={(e) => setFormData({ ...formData, natureOfDeviation: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Details of Deviation</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.detailsOfDeviation} onChange={(e) => setFormData({ ...formData, detailsOfDeviation: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsible Persons (Max 3)</label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] custom-scrollbar"
                  value={formData.responsiblePersonIds}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions);
                    setFormData({ ...formData, responsiblePersonIds: options.map(o => o.value) });
                  }}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="py-1 px-2">{u.firstName} {u.lastName} ({u.department})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">Hold Ctrl (or Cmd) to select multiple.</p>
              </div>
            </div>
          ) : deviation ? (
            <div className="space-y-6">
              <div className="bg-orange-50/50 p-5 rounded-xl border border-orange-100 grid grid-cols-2 gap-4 text-sm text-slate-700">
                <div><span className="font-semibold text-slate-900">Department:</span> {deviation.department}</div>
                <div><span className="font-semibold text-slate-900">Line:</span> {deviation.line}</div>
                <div><span className="font-semibold text-slate-900">Dates:</span> {new Date(deviation.startDate).toLocaleDateString()} to {new Date(deviation.endDate).toLocaleDateString()}</div>
                <div><span className="font-semibold text-slate-900">Parameter Under Deviation:</span> {deviation.parameterUnderDeviation}</div>
                <div><span className="font-semibold text-slate-900">Specification of Parameter:</span> {deviation.parameterSpecification}</div>
                <div className="col-span-2"><span className="font-semibold text-slate-900">Nature of Deviation:</span> {deviation.natureOfDeviation}</div>
                <div className="col-span-2"><span className="font-semibold text-slate-900">Details:</span> {deviation.detailsOfDeviation}</div>
                <div className="col-span-2 flex items-center">
                  <span className="font-semibold text-slate-900">Status:</span> 
                  <span className="ml-2 inline-flex items-center rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-orange-700 shadow-sm ring-1 ring-inset ring-orange-200">
                    {deviation.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Responsible Action Section */}
              {deviation.status === 'OPEN' && isResponsiblePerson && !hasSignedAsResponsible && (
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                  <h4 className="font-semibold text-slate-900 text-base mb-4">Action Plan (Responsible Person)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Root Cause Analysis</label>
                      <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={actionData.rootCauseAnalysis} onChange={(e) => setActionData({ ...actionData, rootCauseAnalysis: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Containment Action</label>
                      <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={actionData.containmentAction} onChange={(e) => setActionData({ ...actionData, containmentAction: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Corrective Action</label>
                      <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={actionData.correctiveAction} onChange={(e) => setActionData({ ...actionData, correctiveAction: e.target.value })} />
                    </div>
                    <button onClick={handleActionSign} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-blue-500/30 hover:bg-blue-700 flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save & Sign
                    </button>
                  </div>
                </div>
              )}

              {/* Action Plans Summary */}
              <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl shadow-sm text-sm text-slate-700">
                <h4 className="font-semibold text-slate-900 text-base mb-4">Action Plans</h4>
                {deviation.status !== 'OPEN' ? (
                  <>
                    <div><span className="font-semibold text-slate-900">Root Cause Analysis:</span> {deviation.rootCauseAnalysis || 'N/A'}</div>
                    <div className="mt-3"><span className="font-semibold text-slate-900">Containment Action:</span> {deviation.containmentAction || 'N/A'}</div>
                    <div className="mt-3"><span className="font-semibold text-slate-900">Corrective Action:</span> {deviation.correctiveAction || 'N/A'}</div>
                  </>
                ) : (
                  <div className="italic text-slate-500 mb-2">Awaiting action plans from responsible persons.</div>
                )}
                <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned Responsible Persons</span>
                  {deviation.responsiblePersons.map((rp: any) => (
                    <div key={rp.id} className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${rp.signedAt ? 'text-green-500' : 'text-slate-300'}`} />
                      <span className="font-medium">{rp.user?.firstName} {rp.user?.lastName}</span>
                      {rp.signedAt ? <span className="text-slate-500 italic text-xs ml-auto">Signed on {new Date(rp.signedAt).toLocaleString()}</span> : <span className="text-amber-600 italic text-xs ml-auto">Pending Signature</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5-Step Approval Flow UI */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 text-base">Approval Workflow</h4>
                
                {/* Step 1: Functional Head */}
                <ApprovalStep 
                  title="Step 1: Functional Head"
                  status={deviation.functionalHeadId ? 'completed' : deviation.status === 'PENDING_FUNCTIONAL_HEAD' ? 'pending' : 'waiting'}
                  remark={deviation.functionalHeadRemarks}
                  signedBy={deviation.functionalHead}
                  signedAt={deviation.functionalHeadSignedAt}
                  canApprove={deviation.status === 'PENDING_FUNCTIONAL_HEAD' && isFunctionalHead}
                  remarkValue={stepRemark}
                  onRemarkChange={setStepRemark}
                  onApprove={() => handleStepApprove('functional')}
                  loading={loading}
                />

                {/* Step 2: QA Head */}
                <ApprovalStep 
                  title="Step 2: QA Head"
                  status={deviation.qaHeadId ? 'completed' : deviation.status === 'PENDING_QA_HEAD' ? 'pending' : 'waiting'}
                  remark={deviation.qaHeadRemarks}
                  signedBy={deviation.qaHead}
                  signedAt={deviation.qaHeadSignedAt}
                  canApprove={deviation.status === 'PENDING_QA_HEAD' && isQAHead}
                  remarkValue={stepRemark}
                  onRemarkChange={setStepRemark}
                  onApprove={() => handleStepApprove('qa')}
                  loading={loading}
                />

                {/* Step 3: Plant Head */}
                <ApprovalStep 
                  title="Step 3: Plant Head"
                  status={deviation.plantHeadId ? 'completed' : deviation.status === 'PENDING_PLANT_HEAD' ? 'pending' : 'waiting'}
                  remark={deviation.plantHeadRemarks}
                  signedBy={deviation.plantHead}
                  signedAt={deviation.plantHeadSignedAt}
                  canApprove={deviation.status === 'PENDING_PLANT_HEAD' && isPlantHead}
                  remarkValue={stepRemark}
                  onRemarkChange={setStepRemark}
                  onApprove={() => handleStepApprove('plant')}
                  loading={loading}
                />

                {/* Step 4: Process Head */}
                <ApprovalStep 
                  title="Step 4: Process Head"
                  status={deviation.processHeadId ? 'completed' : deviation.status === 'PENDING_PROCESS_HEAD' ? 'pending' : 'waiting'}
                  remark={deviation.processHeadRemarks}
                  signedBy={deviation.processHead}
                  signedAt={deviation.processHeadSignedAt}
                  canApprove={deviation.status === 'PENDING_PROCESS_HEAD' && isProcessHead}
                  remarkValue={stepRemark}
                  onRemarkChange={setStepRemark}
                  onApprove={() => handleStepApprove('process')}
                  loading={loading}
                />

                {/* Step 5: CEO */}
                <ApprovalStep 
                  title="Step 5: CEO"
                  status={deviation.ceoId ? 'completed' : deviation.status === 'PENDING_CEO' ? 'pending' : 'waiting'}
                  remark={deviation.ceoRemarks}
                  signedBy={deviation.ceo}
                  signedAt={deviation.ceoSignedAt}
                  canApprove={deviation.status === 'PENDING_CEO' && isCEO}
                  remarkValue={stepRemark}
                  onRemarkChange={setStepRemark}
                  onApprove={() => handleStepApprove('ceo')}
                  loading={loading}
                />
              </div>

              {/* Audit Trail Section */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h4 className="font-semibold text-slate-800 text-base mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  Audit Trail
                </h4>
                <div className="flow-root">
                  <ul role="list" className="-mb-8">
                    {deviation.auditLogs?.map((log: any, logIdx: number) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {logIdx !== deviation.auditLogs.length - 1 ? (
                            <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex items-start space-x-3">
                            <div>
                              <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white shadow-sm ${
                                log.action.includes('CREATE') ? 'bg-orange-100 text-orange-600' :
                                log.action.includes('SIGN') || log.action.includes('APPROVE') ? 'bg-emerald-100 text-emerald-600' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {log.action.includes('SIGN') || log.action.includes('APPROVE') ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-2">
                              <div>
                                <p className="text-sm text-slate-600">
                                  {log.details || log.action.replace(/_/g, ' ')}{' '}
                                  <span className="font-semibold text-slate-900">
                                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                                  </span>
                                </p>
                              </div>
                              <div className="whitespace-nowrap text-right text-sm text-slate-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                    {(!deviation.auditLogs || deviation.auditLogs.length === 0) && (
                      <li className="text-sm text-slate-500 italic pb-8 pl-4">No audit logs found.</li>
                    )}
                  </ul>
                </div>
              </div>

            </div>
          ) : (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p>Loading details...</p>
              </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3 shrink-0">
          <button
            type="button"
            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
            onClick={onClose}
          >
            {isNew ? 'Cancel' : 'Close'}
          </button>
          {isNew && (
            <button
              type="button"
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition shadow-lg shadow-orange-500/30 flex items-center justify-center font-medium disabled:opacity-50"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Deviation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalStep({ title, status, remark, signedBy, signedAt, canApprove, remarkValue, onRemarkChange, onApprove, loading }: any) {
  return (
    <div className={`p-4 border rounded-lg transition-all ${
      status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
      status === 'pending' ? 'bg-orange-50 border-orange-200' :
      'bg-slate-50 border-slate-200 opacity-60'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h5 className={`font-semibold ${status === 'completed' ? 'text-emerald-900' : status === 'pending' ? 'text-orange-900' : 'text-slate-700'}`}>
          {title}
        </h5>
        {status === 'completed' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
        {status === 'pending' && <Clock className="w-5 h-5 text-orange-600 animate-pulse" />}
      </div>

      {status === 'completed' ? (
        <div className="text-sm">
          <p className="text-emerald-800 italic mb-2">"{remark || 'No remarks provided.'}"</p>
          <p className="text-emerald-600 text-xs">
            Approved by <span className="font-bold">{signedBy?.firstName} {signedBy?.lastName}</span> on {new Date(signedAt).toLocaleString()}
          </p>
        </div>
      ) : status === 'pending' && canApprove ? (
        <div className="space-y-3">
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            placeholder="Provide remarks..."
            value={remarkValue}
            onChange={(e) => onRemarkChange(e.target.value)}
          />
          <button
            onClick={onApprove}
            disabled={loading}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Approve & Forward
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {status === 'pending' ? 'Awaiting action from designated person.' : 'Next stage in workflow.'}
        </p>
      )}
    </div>
  );
}
