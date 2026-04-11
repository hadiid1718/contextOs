import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAdminAuth from '../../hooks/useAdminAuth';
import useNotifStore from '../../store/notifStore';
import useAuthStore from '../../store/authStore';
import Spinner from '../Spinner';

const GuardLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#070a10] text-text2">
    <div className="flex items-center gap-3">
      <Spinner size={6} />
      <span className="text-sm">Validating superadmin access...</span>
    </div>
  </div>
);

const useNotifyAccessDenied = () => {
  const hasNotifiedRef = useRef(false);

  return () => {
    if (hasNotifiedRef.current) return;

    useNotifStore.getState().pushToast({
      severity: 'error',
      message: 'Access denied - superadmin only',
      route: '/dashboard',
    });

    hasNotifiedRef.current = true;
  };
};

export const AdminRouteGuard = ({ children }) => {
  const location = useLocation();
  const notifyDenied = useNotifyAccessDenied();

  const {
    isAuthenticated,
    role,
    authLoading,
    bootstrapped,
    bootstrap,
  } = useAdminAuth();

  const user = useAuthStore((state) => state.user);
  const regularAuth = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!bootstrapped && !authLoading) {
      void bootstrap();
    }
  }, [authLoading, bootstrapped, bootstrap]);

  if (authLoading || !bootstrapped) {
    return <GuardLoader />;
  }

  if (isAuthenticated && role === 'superadmin') {
    return children;
  }

  if (regularAuth && user?.role && user.role !== 'superadmin') {
    notifyDenied();
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
};

export const AdminLoginRouteGuard = ({ children }) => {
  const notifyDenied = useNotifyAccessDenied();

  const {
    isAuthenticated,
    role,
    authLoading,
    bootstrapped,
    bootstrap,
  } = useAdminAuth();

  const user = useAuthStore((state) => state.user);
  const regularAuth = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!bootstrapped && !authLoading) {
      void bootstrap();
    }
  }, [authLoading, bootstrapped, bootstrap]);

  if (authLoading || !bootstrapped) {
    return <GuardLoader />;
  }

  if (isAuthenticated && role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  if (regularAuth && user?.role && user.role !== 'superadmin') {
    notifyDenied();
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
