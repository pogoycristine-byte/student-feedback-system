import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeedbackManagement from './pages/FeedbackManagement';
import Categories from './pages/Categories';
import Students from './pages/Students';
import FeedbackChat from './pages/FeedbackChat';
import SystemSettings from './pages/SystemSettings';
import ReportsAnalytics from './pages/ReportsAnalytics';
import StaffManageFeedback from './pages/StaffManageFeedback';
import SchedulesPage from './pages/SchedulesPage';
import Announcements from './pages/Announcements';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-app-gradient">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const AppLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-app-gradient">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/feedback"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <FeedbackManagement />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/categories"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <Categories />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/students"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <Students />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <ReportsAnalytics />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <SystemSettings />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/feedback/:id/chat"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <FeedbackChat />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            {/* Staff only route */}
            <Route
              path="/staff/manage"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <StaffManageFeedback />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/schedules"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <SchedulesPage />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            {/* Announcements route */}
            <Route
              path="/announcements"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <Announcements />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;