import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';

const OAuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hasOpener = Boolean(window.opener && window.opener !== window);

    if (hasOpener) {
      window.opener.postMessage({ type: 'oauth:success' }, window.location.origin);
      window.setTimeout(() => window.close(), 150);
      return;
    }

    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-text2">
      <div className="flex items-center gap-3 text-sm">
        <Spinner size={5} />
        Completing OAuth sign in...
      </div>
    </div>
  );
};

export default OAuthSuccess;

