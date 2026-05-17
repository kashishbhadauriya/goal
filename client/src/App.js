import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import TeamGoalsPage from './pages/TeamGoalsPage';
import CheckinsPage from './pages/CheckinsPage';
import ReportsPage from './pages/ReportsPage';
import AdminPage from './pages/AdminPage';
import AuditPage from './pages/AuditPage';
import './index.css';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="goals" element={<PrivateRoute roles={['employee', 'manager']}><GoalsPage /></PrivateRoute>} />
        <Route path="team-goals" element={<PrivateRoute roles={['manager', 'admin']}><TeamGoalsPage /></PrivateRoute>} />
        <Route path="checkins" element={<PrivateRoute roles={['manager', 'admin']}><CheckinsPage /></PrivateRoute>} />
        <Route path="reports" element={<PrivateRoute roles={['manager', 'admin']}><ReportsPage /></PrivateRoute>} />
        <Route path="audit" element={<PrivateRoute roles={['admin']}><AuditPage /></PrivateRoute>} />
        <Route path="admin" element={<PrivateRoute roles={['admin']}><AdminPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
