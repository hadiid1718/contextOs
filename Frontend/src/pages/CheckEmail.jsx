import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLogo from '../components/AuthLogo';
import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/Footer';
import Input from '../components/Input';
import Navbar from '../components/Navbar';
import authService from '../services/authService';

const CheckEmail = () => {
  const location = useLocation();

  const initialEmail = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return location.state?.email || params.get('email') || '';
  }, [location.search, location.state]);

  const [email, setEmail] = useState(initialEmail);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendPending, setResendPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!secondsLeft) return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const resendVerificationEmail = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setErrorMessage('Enter your email to resend the verification link.');
      return;
    }

    setResendPending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authService.resendVerification({ email: nextEmail });
      setSuccessMessage(
        response?.message ||
          'If the account exists and is unverified, a verification email has been sent.'
      );
      setSecondsLeft(60);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          'Unable to resend verification email right now. Please try again.'
      );
    } finally {
      setResendPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar isPublic />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md items-center px-4 py-10">
        <div className="w-full">
          <AuthLogo />
          <Card title="Check your email" description="Verify your account to continue.">
            <p className="text-sm text-text2">
              We sent a verification link to your inbox. After you click it, you will be signed in automatically and redirected to your dashboard.
            </p>

            <div className="mt-4 space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />

              {secondsLeft > 0 ? (
                <p className="text-xs text-text3">You can resend another verification email in {secondsLeft}s.</p>
              ) : null}

              {successMessage ? <p className="text-sm text-success">{successMessage}</p> : null}
              {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}

              <Button
                type="button"
                className="w-full"
                variant="secondary"
                onClick={resendVerificationEmail}
                disabled={resendPending || secondsLeft > 0}
              >
                {resendPending ? 'Sending verification email...' : 'Resend verification email'}
              </Button>
            </div>

            <div className="mt-5 flex items-center justify-between text-sm">
              <Link className="text-brand hover:text-brand-dark" to="/login">
                Back to login
              </Link>
              <Link className="text-brand hover:text-brand-dark" to="/register">
                Register again
              </Link>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CheckEmail;
