import { useState, useEffect } from "react";
import {
  Download,
  Plus,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import SummaryTab from "../components/risks/pfmea/SummaryTab";
import WorksheetTab from "../components/risks/pfmea/WorksheetTab";
import RiskMatrixTab from "../components/risks/pfmea/RiskMatrixTab";
import HistoryTab from "../components/risks/pfmea/HistoryTab";
import { pfmeaApi } from "../lib/pfmeaApi";
import { useAuthStore } from "../stores/authStore";

export default function PfmeaPage() {
  const [activeTab, setActiveTab] = useState<
    "summary" | "worksheet" | "matrix" | "history"
  >("summary");

  const [processes, setProcesses] = useState<any[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [triggerAddRow, setTriggerAddRow] = useState(0);

  const currentUser = useAuthStore((state) => state.user);
  const canCreate = ['admin', 'creator', 'reviewer', 'dept_head'].includes(currentUser?.role || '');

  const [stats, setStats] = useState({
    totalSteps: 0,
    failureModes: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    openActions: 0,
    completed: 0
  });

  useEffect(() => {
    loadPfmeas();
  }, []);

  useEffect(() => {
    if (selectedProcessId === 'ALL') {
      // Aggregate stats for all processes
      Promise.all(processes.map((p: any) => pfmeaApi.getOne(p.id))).then(responses => {
        const allRows = responses.flatMap(res => res ? res.worksheetRows : []);
        setStats({
          totalSteps: new Set(allRows.map((r: any) => r.processStep)).size || allRows.length,
          failureModes: allRows.length,
          highRisk: allRows.filter((r: any) => r.riskLevel === 'High' || r.riskLevel === 'Critical').length,
          mediumRisk: allRows.filter((r: any) => r.riskLevel === 'Medium').length,
          lowRisk: allRows.filter((r: any) => r.riskLevel === 'Low').length,
          openActions: allRows.filter((r: any) => r.status === 'Open' || !r.status).length,
          completed: allRows.filter((r: any) => r.status === 'Completed').length
        });
      });
    } else if (selectedProcessId) {
      pfmeaApi.getOne(selectedProcessId).then(res => {
        if (res && res.worksheetRows) {
          const rows = res.worksheetRows;
          setStats({
            totalSteps: new Set(rows.map((r: any) => r.processStep)).size || rows.length,
            failureModes: rows.length,
            highRisk: rows.filter((r: any) => r.riskLevel === 'High' || r.riskLevel === 'Critical').length,
            mediumRisk: rows.filter((r: any) => r.riskLevel === 'Medium').length,
            lowRisk: rows.filter((r: any) => r.riskLevel === 'Low').length,
            openActions: rows.filter((r: any) => r.status === 'Open' || !r.status).length,
            completed: rows.filter((r: any) => r.status === 'Completed').length
          });
        }
      });
    }
  }, [selectedProcessId, activeTab, processes]);

  const loadPfmeas = async () => {
    try {
      const data = await pfmeaApi.getAll();
      if (data && data.length > 0) {
        setProcesses(data);
        setSelectedProcessId(data[0].id);
      } else {
        // Seed default if empty
        const seeded = await pfmeaApi.create({
          pfmeaNumber: 'PFMEA-001',
          projectName: 'Initial Startup',
          processName: 'Furnace',
          revisionNumber: '01'
        });
        setProcesses([seeded]);
        setSelectedProcessId(seeded.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentProcessProps = processes.find(p => p.id === selectedProcessId);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-100px)]">
      {/* Header Section */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                PFMEA Analysis
              </h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-full">
                Active
              </span>
            </div>
            <div className="flex items-center ml-12 gap-3 mt-1">
              <span className="text-slate-500 font-medium">Process:</span>
              <select
                value={selectedProcessId}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (val === 'NEW') {
                    const newProcessName = prompt("Enter the name of the new process you want to analyze (e.g. Furnace, Cutting):");
                    if (newProcessName && newProcessName.trim() !== '') {
                      try {
                        const newProject = await pfmeaApi.create({
                          pfmeaNumber: `PFMEA-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                          projectName: 'New Analysis',
                          processName: newProcessName.trim(),
                          revisionNumber: '00'
                        });
                        setProcesses(prev => [...prev, newProject]);
                        setSelectedProcessId(newProject.id);
                      } catch (err) {
                        console.error("Failed to create new PFMEA", err);
                      }
                    }
                  } else {
                    setSelectedProcessId(val);
                  }
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <option value="ALL" className="font-bold text-slate-800">All Processes (Aggregate View)</option>
                <option disabled>──────────</option>
                {processes.map(p => (
                  <option key={p.id} value={p.id}>{p.processName}</option>
                ))}
                {canCreate && (
                  <>
                    <option disabled>──────────</option>
                    <option value="NEW" className="font-bold text-blue-600">+ Create New Process Analysis</option>
                  </>
                )}
              </select>
              <span className="text-slate-400 font-medium ml-2">
                • Rev: {currentProcessProps?.revisionNumber || '00'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            {canCreate && (
              <button 
                onClick={() => {
                  setActiveTab('worksheet');
                  setTriggerAddRow(prev => prev + 1);
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Process Step
              </button>
            )}
          </div>
        </div>

        {/* Risk Overview Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
            <span className="text-slate-500 text-sm font-semibold mb-1">
              Total Steps
            </span>
            <span className="text-2xl font-black text-slate-800">{stats.totalSteps}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
            <span className="text-slate-500 text-sm font-semibold mb-1">
              Failure Modes
            </span>
            <span className="text-2xl font-black text-slate-800">{stats.failureModes}</span>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col justify-center">
            <span className="text-red-500 text-sm font-semibold mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> High Risk
            </span>
            <span className="text-2xl font-black text-red-700">{stats.highRisk}</span>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col justify-center">
            <span className="text-orange-500 text-sm font-semibold mb-1">
              Medium Risk
            </span>
            <span className="text-2xl font-black text-orange-700">{stats.mediumRisk}</span>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center">
            <span className="text-emerald-500 text-sm font-semibold mb-1">
              Low Risk
            </span>
            <span className="text-2xl font-black text-emerald-700">{stats.lowRisk}</span>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex flex-col justify-center">
            <span className="text-yellow-600 text-sm font-semibold mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Open Actions
            </span>
            <span className="text-2xl font-black text-yellow-700">{stats.openActions}</span>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
            <span className="text-blue-500 text-sm font-semibold mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
            <span className="text-2xl font-black text-blue-700">{stats.completed}</span>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          {[
            { id: "summary", label: "Summary" },
            { id: "worksheet", label: "Worksheet" },
            { id: "matrix", label: "Risk Matrix" },
            { id: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-8 py-4 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="p-6 flex-1 bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-500 font-bold">Loading DB State...</div>
          ) : (
            <>
              {activeTab === "summary" && <SummaryTab pfmeaId={selectedProcessId} />}
              {activeTab === "worksheet" && <WorksheetTab pfmeaId={selectedProcessId} externalAddTrigger={triggerAddRow} />}
              {activeTab === "matrix" && <RiskMatrixTab pfmeaId={selectedProcessId} />}
              {activeTab === "history" && <HistoryTab pfmeaId={selectedProcessId} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
