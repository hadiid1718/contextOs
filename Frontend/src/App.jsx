import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Footer from './components/Footer';
import NotificationDrawer from './components/notifications/NotificationDrawer';
import NotificationToastStack from './components/notifications/NotificationToastStack';
import ProtectedRoute from './components/ProtectedRoute';
import {
  AdminLoginRouteGuard,
  AdminRouteGuard,
} from './components/admin/RouteGuard';
import BillingUpgradeModal from './components/billing/BillingUpgradeModal';
import TopBar from './components/TopBar';
import useAuth from './hooks/useAuth';
import useNotifications from './hooks/useNotifications';
import Billing from './pages/Billing';
import BillingSettings from './pages/BillingSettings';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import Graph from './pages/Graph';
import Integrations from './pages/Integrations';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import Query from './pages/Query';
import Register from './pages/Register';
import Settings from './pages/Settings';
import NotificationSettings from './pages/NotificationSettings';
import TeamSettings from './pages/TeamSettings';
import InviteResponse from './pages/InviteResponse';
import Contact from './pages/Contact';
import Home from './pages/Home';
import IntegrationConnectPopup from './pages/IntegrationConnectPopup';
import OAuthFailure from './pages/OAuthFailure';
import OAuthSuccess from './pages/OAuthSuccess';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLoginPage from './pages/admin/AdminLoginPage';

const App = () => {
  const { bootstrapSession } = useAuth();
  const didBootstrapRef = useRef(false);

  useEffect(() => {
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;
    bootstrapSession();
  }, [bootstrapSession]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/auth/success" element={<OAuthSuccess />} />
      <Route path="/auth/failure" element={<OAuthFailure />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/invite/:token" element={<InviteResponse />} />
      <Route
        path="/admin/login"
        element={
          <AdminLoginRouteGuard>
            <AdminLoginPage />
          </AdminLoginRouteGuard>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRouteGuard>
            <AdminDashboard />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/integrations/connect/:provider"
        element={
          <ProtectedRoute>
            <IntegrationConnectPopup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShellWrapper />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const AppShellWrapper = () => {
  useNotifications({ bootstrap: true });

  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <main className="w-full">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/query" element={<Query />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/team" element={<TeamSettings />} />
            <Route path="/settings/notifications" element={<NotificationSettings />} />
            <Route path="/settings/billing" element={<BillingSettings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
      <NotificationDrawer />
      <NotificationToastStack />
      <BillingUpgradeModal />
    </div>
  );
};

export default App;
