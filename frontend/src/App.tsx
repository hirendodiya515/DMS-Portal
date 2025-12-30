import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import ObjectivesPage from './pages/ObjectivesPage';
import RisksPage from './pages/RisksPage';
import AuditLogsPage from './pages/AuditLogsPage';
import Layout from './components/Layout';
import DepartmentPage from './pages/DepartmentPage';
import AuditPlanPage from './pages/internal-audit/AuditPlanPage';
import AuditorsPage from './pages/internal-audit/AuditorsPage';
import AuditorSchedulePage from './pages/internal-audit/AuditSchedulePage';
import PerformAuditPage from './pages/internal-audit/PerformAuditPage';
import AuditSummaryPage from './pages/internal-audit/AuditSummaryPage';
import OrgChartPage from './pages/OrgChartPage';
import FlowchartPage from './pages/FlowchartPage';
import CompetencyList from './components/competency/CompetencyList';
import JobRoleManager from './components/competency/JobRoleManager';
import EmployeeSkillMatrix from './components/competency/EmployeeSkillMatrix';
import SkillAssessmentPage from './pages/SkillAssessmentPage';
import GapAnalysisDashboard from './components/competency/GapAnalysisDashboard';
import TrainingManager from './components/competency/TrainingManager';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/:id" element={<DocumentDetailPage />} />
          <Route path="org-chart" element={<OrgChartPage />} />
          <Route path="objectives" element={<ObjectivesPage />} />
          <Route path="risks" element={<RisksPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="department" element={<DepartmentPage />} />
          <Route path="flowchart" element={<FlowchartPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          {/* Competency Routes */}
          <Route path="competency/dashboard" element={<GapAnalysisDashboard />} />
          <Route path="competency/assessment" element={<SkillAssessmentPage />} />
          <Route path="competency/employees" element={<EmployeeSkillMatrix />} />
          <Route path="competency/roles" element={<JobRoleManager />} />
          <Route path="competency/master" element={<CompetencyList />} />
          <Route path="competency/training" element={<TrainingManager />} />
          
          {/* Internal Audit Routes */}
          <Route path="internal-audit/plan" element={<AuditPlanPage />} />
          <Route path="internal-audit/auditors" element={<AuditorsPage />} />
          <Route path="internal-audit/schedule" element={<AuditorSchedulePage />} />
          <Route path="internal-audit/checksheet" element={<div className="text-center text-slate-500 mt-20">Internal Audit - Checksheet coming soon...</div>} />
          <Route path="internal-audit/perform" element={<PerformAuditPage />} />
          <Route path="internal-audit/summary" element={<AuditSummaryPage />} />
          <Route path="internal-audit/nc-tracking" element={<div className="text-center text-slate-500 mt-20">Internal Audit - NC Tracking coming soon...</div>} />
          

        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

