import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLoginCard from '../../components/admin/AdminLoginCard';
import AdminLoginForm from '../../components/admin/AdminLoginForm';
import useAdminAuth from '../../hooks/useAdminAuth';

const normalizeLoginError = (error) => {
  const status = error?.response?.status;

  if (status === 401) return 'Invalid credentials';
  if (status === 423) return 'Account locked. Wait 15 minutes and try again.';
  if (status === 429) return 'Too many login attempts from this IP. Try again later.';

  return error?.response?.data?.message || error?.message || 'Unable to sign in right now.';
};

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login, loginPending } = useAdminAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  const adminEmailHint = useMemo(() => {
    return import.meta.env.VITE_ADMIN_EMAIL || 'superadmin@contextos.internal';
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 460);
  };

  const handleSubmit = async ({ email, password }) => {
    try {
      setErrorMessage('');
      await login({ email, password });
      navigate('/admin', { replace: true });
    } catch (error) {
      setErrorMessage(normalizeLoginError(error));
      triggerShake();
    }
  };

  return (
    <div className="admin-shell admin-grid-overlay flex min-h-screen items-center justify-center px-4 py-10">
      <AdminLoginCard errorMessage={errorMessage} shake={shake}>
        <AdminLoginForm
          pending={loginPending}
          onSubmit={handleSubmit}
          adminEmailHint={adminEmailHint}
        />
      </AdminLoginCard>
    </div>
  );
};

export default AdminLoginPage;
