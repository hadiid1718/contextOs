import { zodResolver } from '@hookform/resolvers/zod';
import { Github } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import AuthLogo from '../components/AuthLogo';
import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/Footer';
import Input from '../components/Input';
import Navbar from '../components/Navbar';
import authService from '../services/authService';
import useAuth from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [shaking, setShaking] = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');
  const [resendPending, setResendPending] = useState(false);
  const { login, silentRefresh } = useAuth();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const loggedOutNotice = params.get('loggedOut') === '1';
  const oauthFailedNotice = params.get('oauth') === 'failed';
  const verifyPendingNotice = params.get('verify') === 'pending';
  const prefetchedEmail = location.state?.email || '';

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: prefetchedEmail,
      password: '',
    },
  });

  const showResendVerification =
    verifyPendingNotice || apiError.toLowerCase().includes('not verified');

  const runShake = () => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 420);
  };

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const refreshAfterOauth = async () => {
    const attempts = 5;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const refreshed = await silentRefresh();
      if (refreshed) return true;

      if (attempt < attempts - 1) {
        await wait(200 * (attempt + 1));
      }
    }

    return false;
  };

  const onSubmit = async (values) => {
    setApiError('');
    setInfoMessage('');
    try {
      const response = await login(values);
      const payload = response?.data || response;
      if (payload?.user?.emailVerified === false) {
        setApiError('Email is not verified. Please verify your inbox link first.');
        runShake();
        return;
      }
      const redirectTo = location.state?.from || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Login failed';
      if (message.toLowerCase().includes('not verified')) {
        setApiError('Email is not verified. Please verify your inbox link first.');
      } else {
        setApiError(message);
      }
      runShake();
    }
  };

  const handleResendVerification = async () => {
    const email = (getValues('email') || '').trim();
    if (!email) {
      setApiError('Enter your email first to resend the verification link.');
      runShake();
      return;
    }

    setResendPending(true);
    setApiError('');
    setInfoMessage('');

    try {
      const response = await authService.resendVerification({ email });
      setInfoMessage(
        response?.message ||
          'If the account exists and is unverified, a verification email has been sent.'
      );
    } catch (error) {
      setApiError(
        error?.response?.data?.message || 'Unable to resend verification email right now.'
      );
      runShake();
    } finally {
      setResendPending(false);
    }
  };

  const handleOauth = async (provider) => {
    setOauthLoading(provider);
    setApiError('');

    try {
      const popup = authService.oauthPopup(provider);
      if (!popup) {
        setApiError('Popup blocked by browser');
        runShake();
        return;
      }

      await new Promise((resolve, reject) => {
        let settled = false;
        const onMessage = async (event) => {
          if (event.origin !== window.location.origin) return;
          const eventType = event.data?.type;
          if (!eventType) return;

          if (eventType === 'oauth:failure') {
            settled = true;
            window.removeEventListener('message', onMessage);
            window.clearInterval(poll);
            window.clearTimeout(timeout);
            reject(new Error('OAuth sign in failed'));
            return;
          }

          if (eventType === 'oauth:success') {
            settled = true;
            window.removeEventListener('message', onMessage);
            window.clearInterval(poll);
            window.clearTimeout(timeout);
            const refreshed = await refreshAfterOauth();
            if (refreshed) resolve(true);
            else reject(new Error('OAuth did not complete. Try again.'));
          }
        };

        window.addEventListener('message', onMessage);

        const poll = window.setInterval(async () => {
          if (settled) return;
          if (popup.closed) {
            settled = true;
            window.removeEventListener('message', onMessage);
            window.clearInterval(poll);
            window.clearTimeout(timeout);
            const refreshed = await refreshAfterOauth();
            if (refreshed) {
              resolve(true);
            } else {
              reject(new Error('OAuth did not complete. Try again.'));
            }
          }
        }, 500);

        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          window.removeEventListener('message', onMessage);
          window.clearInterval(poll);
          if (!popup.closed) popup.close();
          reject(new Error('OAuth timeout. Try again.'));
        }, 90000);
      });

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setApiError(error.message || 'OAuth sign in failed');
      runShake();
    } finally {
      setOauthLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar isPublic />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md items-center px-4 py-10">
        <div className={`w-full ${shaking ? 'animate-shake' : ''}`}>
          <AuthLogo />
          <Card title="Sign in" description="Use your workspace credentials to continue.">
            {verifyPendingNotice ? (
              <p className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                Account created. Verify your email first, then sign in.
              </p>
            ) : null}
            {loggedOutNotice ? (
              <p className="mb-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                You are logged out. Dashboard access requires a signed-in account.
              </p>
            ) : null}
            {oauthFailedNotice ? (
              <p className="mb-3 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
                OAuth sign in failed. Please try again.
              </p>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                enablePasswordToggle
                error={errors.password?.message}
                {...register('password')}
              />
              {apiError ? <p className="text-sm text-error">{apiError}</p> : null}
              {infoMessage ? <p className="text-sm text-success">{infoMessage}</p> : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
              {showResendVerification ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleResendVerification}
                  disabled={resendPending || isSubmitting}
                >
                  {resendPending ? 'Sending verification email...' : 'Resend verification email'}
                </Button>
              ) : null}
            </form>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-text3">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => handleOauth('google')}
                disabled={Boolean(oauthLoading)}
              >
                {oauthLoading === 'google' ? 'Opening Google...' : 'Continue with Google'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => handleOauth('github')}
                disabled={Boolean(oauthLoading)}
              >
                <Github size={16} className="mr-2" />
                {oauthLoading === 'github' ? 'Opening GitHub...' : 'Continue with GitHub'}
              </Button>
            </div>

            <div className="mt-5 flex items-center justify-between text-sm">
              <Link className="text-brand hover:text-brand-dark" to="/forgot-password">
                Forgot password?
              </Link>
              <Link className="text-brand hover:text-brand-dark" to="/register">
                Create account
              </Link>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;

