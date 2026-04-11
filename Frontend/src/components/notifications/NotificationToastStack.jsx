import { useEffect } from 'react';
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useNotifications from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../lib/time';
import useNotifStore from '../../store/notifStore';

const severityMeta = {
  info: {
    icon: Info,
    border: 'border-brand/40',
    iconColor: 'text-brand',
    progress: 'bg-brand',
  },
  success: {
    icon: CircleCheck,
    border: 'border-success/40',
    iconColor: 'text-success',
    progress: 'bg-success',
  },
  warning: {
    icon: TriangleAlert,
    border: 'border-warning/40',
    iconColor: 'text-warning',
    progress: 'bg-warning',
  },
  error: {
    icon: CircleAlert,
    border: 'border-error/40',
    iconColor: 'text-error',
    progress: 'bg-error',
  },
};

const ToastItem = ({ toast, onDismiss, onOpen }) => {
  const meta = severityMeta[toast.severity] || severityMeta.info;
  const Icon = meta.icon;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onDismiss(toast.id);
    }, toast.durationMs || 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [onDismiss, toast.durationMs, toast.id]);

  return (
    <article
      role="status"
      className={`group relative overflow-hidden rounded-xl border bg-bg2/95 px-4 py-3 shadow-2xl backdrop-blur-sm transition hover:translate-y-[-1px] ${meta.border}`}
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={() => onOpen(toast)}
        aria-label="Open notification"
      />

      <div className="pointer-events-none relative flex items-start gap-3">
        <span className={`mt-0.5 ${meta.iconColor}`}>
          <Icon size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-text">{toast.message}</p>
          <p className="mt-1 text-xs text-text3">{formatRelativeTime(toast.createdAt)}</p>
        </div>

        <button
          type="button"
          className="pointer-events-auto rounded-md p-1 text-text3 transition hover:bg-surface hover:text-text"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(toast.id);
          }}
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      <span
        className={`absolute bottom-0 left-0 h-1 origin-left animate-toast-progress ${meta.progress}`}
        style={{ animationDuration: `${toast.durationMs || 5000}ms` }}
      />
    </article>
  );
};

const NotificationToastStack = () => {
  const navigate = useNavigate();
  const toasts = useNotifStore((state) => state.toasts);
  const removeToast = useNotifStore((state) => state.removeToast);
  const { markAsRead } = useNotifications();

  const handleOpenToast = async (toast) => {
    removeToast(toast.id);

    try {
      if (toast.id) {
        await markAsRead(toast.id);
      }
    } catch {
      // The read action failure is already surfaced globally.
    }

    if (toast.route) {
      navigate(toast.route);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto animate-toast-in">
          <ToastItem toast={toast} onDismiss={removeToast} onOpen={handleOpenToast} />
        </div>
      ))}
    </div>
  );
};

export default NotificationToastStack;
