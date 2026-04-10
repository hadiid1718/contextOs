import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import orgService from '../services/orgService';

const decodeInvitationPayload = (token) => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '='));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const InviteResponse = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [apiMessage, setApiMessage] = useState('');

  const payload = useMemo(() => decodeInvitationPayload(token), [token]);
  const orgId = payload?.org_id;

  const acceptMutation = useMutation({
    mutationFn: () => orgService.acceptInvitation({ orgId, token }),
  });

  const declineMutation = useMutation({
    mutationFn: () => orgService.declineInvitation({ orgId, token }),
  });

  const handleAccept = async () => {
    setApiMessage('');
    try {
      const response = await acceptMutation.mutateAsync();
      const accessToken = response?.accessToken || response?.data?.accessToken;
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }
      setApiMessage(response?.message || 'Invitation accepted. Redirecting to dashboard...');
      window.setTimeout(() => navigate('/dashboard', { replace: true }), 900);
    } catch (error) {
      setApiMessage(error?.response?.data?.message || 'Unable to accept invitation.');
    }
  };

  const handleDecline = async () => {
    setApiMessage('');
    try {
      const response = await declineMutation.mutateAsync();
      setApiMessage(response?.message || 'Invitation declined.');
    } catch (error) {
      setApiMessage(error?.response?.data?.message || 'Unable to decline invitation.');
    }
  };

  if (!token || !payload || !orgId) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <Navbar isPublic />
        <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-lg items-center px-4 py-10">
          <div className="w-full">
            <Card title="Invalid invitation" description="This invite link is malformed or no longer valid.">
              <Link className="text-sm text-brand hover:text-brand-dark" to="/login">
                Return to login
              </Link>
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
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-2xl items-center px-4 py-10">
        <div className="w-full">
          <Card title="Welcome to the organisation" description="Review invitation details and choose how to proceed.">
          <div className="space-y-3 rounded-lg border border-border bg-bg3 p-4 text-sm text-text2">
            <p>
              <span className="font-medium text-text">Org ID:</span> {orgId}
            </p>
            <p>
              <span className="font-medium text-text">Invited email:</span> {payload.email}
            </p>
            <p>
              <span className="font-medium text-text">Role:</span> {payload.role}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleAccept} disabled={acceptMutation.isPending || declineMutation.isPending}>
              <CheckCircle2 size={16} className="mr-2" />
              {acceptMutation.isPending ? 'Accepting...' : 'Accept invitation'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-error hover:bg-error/15"
              onClick={handleDecline}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              <XCircle size={16} className="mr-2" />
              {declineMutation.isPending ? 'Declining...' : 'Decline'}
            </Button>
          </div>

            {apiMessage ? <p className="mt-4 text-sm text-text2">{apiMessage}</p> : null}
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default InviteResponse;

