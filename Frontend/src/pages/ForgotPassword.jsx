import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import AuthLogo from '../components/AuthLogo';
import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/Footer';
import Input from '../components/Input';
import Navbar from '../components/Navbar';
import authService from '../services/authService';

const forgotSchema = z.object({
  email: z.string().email('Valid email is required'),
});

const ForgotPassword = () => {
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: '',
    },
  });

  useEffect(() => {
    if (!secondsLeft) return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const submitEmail = async (email) => {
    setError('');
    try {
      await authService.forgotPassword({ email });
      setSubmittedEmail(email);
      setSecondsLeft(90);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to send reset email');
    }
  };

  const onSubmit = async ({ email }) => {
    await submitEmail(email);
  };

  const resend = async () => {
    const email = submittedEmail || getValues('email');
    if (!email) return;
    await submitEmail(email);
  };

  if (submittedEmail) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <Navbar isPublic />
        <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md items-center px-4 py-10">
          <div className="w-full">
            <AuthLogo />
            <Card title="Check your inbox" description={`Reset instructions sent to ${submittedEmail}`}>
              <p className="text-sm text-text2">
                We sent a secure reset token link. You can request a new one when the countdown reaches zero.
              </p>

            <div className="mt-4 rounded-lg border border-border bg-bg3 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-text3">Token cooldown</p>
              <p className="mt-1 text-2xl font-semibold text-text">{secondsLeft}s</p>
            </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <Button type="button" variant="secondary" onClick={resend} disabled={secondsLeft > 0}>
                  Resend token
                </Button>
                <Link className="text-sm text-brand hover:text-brand-dark" to="/login">
                  Back to login
                </Link>
              </div>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar isPublic />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md items-center px-4 py-10">
        <div className="w-full">
          <AuthLogo />
          <Card title="Forgot password" description="Enter your email and we will send a reset link.">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
              {error ? <p className="text-sm text-error">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>

            <p className="mt-5 text-sm text-text2">
              Remembered your password?{' '}
              <Link className="text-brand hover:text-brand-dark" to="/login">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ForgotPassword;

