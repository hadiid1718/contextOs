import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuthFailure = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hasOpener = Boolean(window.opener && window.opener !== window);

    if (hasOpener) {
      window.opener.postMessage({ type: 'oauth:failure' }, '*');
    }

    // Fallback signal for cases where opener is lost by browser security policies.
    try {
      window.localStorage.setItem(
        'oauth:result',
        JSON.stringify({ type: 'oauth:failure', at: Date.now() })
      );
      window.localStorage.removeItem('oauth:result');
    } catch {
      // Ignore storage errors and rely on postMessage/polling in opener.
    }

    window.setTimeout(() => window.close(), 100);

    const fallbackTimer = window.setTimeout(() => {
      navigate('/login?oauth=failed', { replace: true });
    }, 700);

    return () => window.clearTimeout(fallbackTimer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-center text-sm text-error">
      OAuth sign in failed. Redirecting to login...
    </div>
  );
};

export default OAuthFailure;

