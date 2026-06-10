import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MocForm from './pages/MocForm';
import MocDashboard from './pages/MocDashboard';
import LoginPage from './pages/LoginPage';

// Simple Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('moc_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <MocDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/new-moc" 
            element={
              <ProtectedRoute>
                <MocForm />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/edit-moc/:id" 
            element={
              <ProtectedRoute>
                <MocForm />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
