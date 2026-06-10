import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DeviationDashboard from './pages/DeviationDashboard';
import DeviationFormPage from './pages/DeviationFormPage';
import DeviationDetailsPage from './pages/DeviationDetailsPage';

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('pd_token');
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
                <DeviationDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/new-deviation" 
            element={
              <ProtectedRoute>
                <DeviationFormPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/deviation/:id" 
            element={
              <ProtectedRoute>
                <DeviationDetailsPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
