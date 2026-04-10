import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuthFailure = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hasOpener = Boolean(window.opener && window.opener !== window);

    if (hasOpener) {
      window.opener.postMessage({ type: 'oauth:failure' }, window.location.origin);
      window.setTimeout(() => window.close(), 150);
      return;
    }

    navigate('/login?oauth=failed', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-center text-sm text-error">
      OAuth sign in failed. Redirecting to login...
    </div>
  );
};

export default OAuthFailure;

