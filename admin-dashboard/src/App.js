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
import MessagesPage from './pages/MessagesPage';
import SupportTicketsPage from './pages/SupportTicketsPage';

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

// ✅ ADDED: admin-only route guard — redirects staff away from admin-only pages
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-app-gradient">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
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

            {/* ✅ ADDED: AdminRoute — only admin can manage categories */}
            <Route
              path="/categories"
              element={
                <AdminRoute>
                  <AppLayout>
                    <Categories />
                  </AppLayout>
                </AdminRoute>
              }
            />

            {/* ✅ ADDED: AdminRoute — only admin can manage students */}
            <Route
              path="/students"
              element={
                <AdminRoute>
                  <AppLayout>
                    <Students />
                  </AppLayout>
                </AdminRoute>
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

            {/* ✅ ADDED: AdminRoute — only admin can access system settings */}
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <AppLayout>
                    <SystemSettings />
                  </AppLayout>
                </AdminRoute>
              }
            />

            {/* ✅ ADDED: PrivateRoute — staff settings, same guard as /schedules */}
            <Route
              path="/staff/settings"
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

            <Route
              path="/messages"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <MessagesPage />
                  </AppLayout>
                </PrivateRoute>
              }
            />

            {/* ✅ CHANGED: PrivateRoute — staff can now access support tickets */}
            <Route
              path="/support-tickets"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <SupportTicketsPage />
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