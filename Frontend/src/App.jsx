import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import useAuth from './hooks/useAuth';
import Billing from './pages/Billing';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import Graph from './pages/Graph';
import Integrations from './pages/Integrations';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import Query from './pages/Query';
import Register from './pages/Register';
import Settings from './pages/Settings';
import TeamSettings from './pages/TeamSettings';
import InviteResponse from './pages/InviteResponse';
import Contact from './pages/Contact';
import Home from './pages/Home';
import IntegrationConnectPopup from './pages/IntegrationConnectPopup';
import OAuthFailure from './pages/OAuthFailure';
import OAuthSuccess from './pages/OAuthSuccess';
import Pricing from './pages/Pricing';

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
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/auth/success" element={<OAuthSuccess />} />
      <Route path="/auth/failure" element={<OAuthFailure />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/invite/:token" element={<InviteResponse />} />
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
  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar />
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Sidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/query" element={<Query />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/team" element={<TeamSettings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default App;
