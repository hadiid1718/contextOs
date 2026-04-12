import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import AuthLogo from '../components/AuthLogo';
import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/Footer';
import Input from '../components/Input';
import Navbar from '../components/Navbar';
import StepProgress from '../components/StepProgress';
import useAuth from '../hooks/useAuth';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
    orgName: z.string().min(2, 'Organization name is required'),
    role: z.enum(['owner', 'admin', 'member', 'viewer'], {
      message: 'Role is required',
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const fieldsByStep = {
  1: ['name', 'email', 'password', 'confirmPassword'],
  2: ['orgName'],
  3: ['role'],
};

const totalSteps = 3;

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [apiError, setApiError] = useState('');
  const { register: registerAccount } = useAuth();

  const {
    register,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      orgName: '',
      role: '',
    },
  });

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Create credentials';
    if (step === 2) return 'Your organization';
    return 'Choose your role';
  }, [step]);

  const nextStep = async () => {
    const valid = await trigger(fieldsByStep[step]);
    if (!valid) return;
    setStep((value) => Math.min(totalSteps, value + 1));
  };

  const previousStep = () => {
    setStep((value) => Math.max(1, value - 1));
  };

  const onSubmit = async (values) => {
    setApiError('');
    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        orgName: values.orgName,
        role: values.role,
      });
      navigate('/check-email', {
        replace: true,
        state: { email: values.email },
      });
    } catch (error) {
      setApiError(error?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar isPublic />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md items-center px-4 py-10">
        <div className="w-full">
          <AuthLogo />
          <Card title="Register" description={stepTitle}>
            <StepProgress currentStep={step} totalSteps={totalSteps} />

          <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {step === 1 ? (
              <>
                <Input label="Full name" placeholder="Jane Doe" error={errors.name?.message} {...register('name')} />
                <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
                <Input label="Password" type="password" enablePasswordToggle error={errors.password?.message} {...register('password')} />
                <Input
                  label="Confirm password"
                  type="password"
                  enablePasswordToggle
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
              </>
            ) : null}

            {step === 2 ? <Input label="Organization name" placeholder="Acme Inc" error={errors.orgName?.message} {...register('orgName')} /> : null}

            {step === 3 ? (
              <label className="block text-sm text-text2">
                <span className="mb-1 block font-medium">Role</span>
                <select
                  className="w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text outline-none ring-brand transition focus:border-border-strong focus:ring-1"
                  {...register('role')}
                >
                  <option value="">Select your role</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                {errors.role?.message ? <span className="mt-1 block text-xs text-error">{errors.role?.message}</span> : null}
              </label>
            ) : null}

            {apiError ? <p className="text-sm text-error">{apiError}</p> : null}

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={previousStep} disabled={step === 1 || isSubmitting}>
                Back
              </Button>

              {step < totalSteps ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </Button>
              )}
            </div>
          </form>

            <p className="mt-5 text-sm text-text2">
              Already have an account?{' '}
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

export default Register;

