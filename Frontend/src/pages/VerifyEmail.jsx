import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AuthLogo from '../components/AuthLogo';
import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import authService from '../services/authService';
import useAuthStore from '../store/authStore';

const VerifyEmail = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    let redirectTimer;

    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing.');
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        const payload = response?.data || response;

        if (payload?.user) {
          setSession({ user: payload.user, token: payload.accessToken || null });
        }

        setStatus('success');
        setMessage(payload?.message || 'Email verified. Redirecting to your dashboard...');
        redirectTimer = window.setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 700);
      } catch (error) {
        setStatus('error');
        setMessage(error?.response?.data?.message || 'Verification token is invalid or expired.');
      }
    };

    verify();

    return () => {
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [navigate, setSession, token]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar isPublic />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md items-center px-4 py-10">
        <div className="w-full">
          <AuthLogo />
          <Card
            title={status === 'pending' ? 'Verifying email' : status === 'success' ? 'Email verified' : 'Verification failed'}
            description="Email verification is required before login."
          >
            <p className="text-sm text-text2">{message}</p>

            <div className="mt-5 flex items-center gap-3">
              <Link className="w-full" to={status === 'success' ? '/dashboard' : '/login'}>
                <Button className="w-full" type="button">
                  {status === 'success' ? 'Open dashboard' : 'Go to login'}
                </Button>
              </Link>
              {status === 'error' ? (
                <Link className="w-full" to="/register">
                  <Button className="w-full" type="button" variant="secondary">
                    Create new account
                  </Button>
                </Link>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default VerifyEmail;
