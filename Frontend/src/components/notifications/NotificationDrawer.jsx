import {
  BellRing,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
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

const severityStyles = {
  info: {
    icon: Info,
    badge: 'bg-brand/20 text-brand',
    avatar: 'from-brand/80 to-accent2/70',
  },
  success: {
    icon: CircleCheck,
    badge: 'bg-success/20 text-success',
    avatar: 'from-success/85 to-emerald-300/70',
  },
  warning: {
    icon: TriangleAlert,
    badge: 'bg-warning/20 text-warning',
    avatar: 'from-warning/85 to-orange-300/70',
  },
  error: {
    icon: CircleAlert,
    badge: 'bg-error/20 text-error',
    avatar: 'from-error/85 to-rose-300/70',
  },
};

const truncate = (value, max = 110) => {
  const text = String(value || '');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const NotificationDrawer = () => {
  const navigate = useNavigate();
  const drawerOpen = useNotifStore((state) => state.drawerOpen);
  const notifications = useNotifStore((state) => state.notifications);
  const pagination = useNotifStore((state) => state.pagination);
  const unreadCount = useNotifStore((state) => state.unreadCount);
  const notificationError = useNotifStore((state) => state.notificationError);
  const setDrawerOpen = useNotifStore((state) => state.setDrawerOpen);

  const {
    markAsRead,
    markAllRead,
    setPage,
    isMarkingRead,
    isMarkingAllRead,
    isFetching,
    clearNotificationError,
  } = useNotifications();

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
    } catch {
      // Error state is already handled in the notifications hook.
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await markAsRead(notification.id);
      }
    } catch {
      return;
    }

    closeDrawer();

    if (notification.route) {
      navigate(notification.route);
    }
  };

  const goToPrevPage = () => {
    if (!pagination.hasPrev) {
      return;
    }
    setPage(pagination.page - 1);
  };

  const goToNextPage = () => {
    if (!pagination.hasNext) {
      return;
    }
    setPage(pagination.page + 1);
  };

  return (
    <div
      className={`fixed inset-0 z-40 ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!drawerOpen}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeDrawer}
        aria-label="Close notifications drawer"
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border-strong bg-bg2/95 shadow-2xl transition-transform duration-300 ease-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="relative overflow-hidden border-b border-border bg-gradient-to-r from-bg3 via-bg2 to-bg2 px-5 pb-4 pt-5">
          <div className="absolute right-[-50px] top-[-50px] h-32 w-32 rounded-full bg-brand/20 blur-2xl" />
          <div className="absolute left-[-30px] top-[-40px] h-24 w-24 rounded-full bg-accent2/10 blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-text3">Notifications</p>
              <h3 className="mt-1 text-lg font-semibold text-text">Inbox</h3>
              <p className="mt-1 text-sm text-text2">
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
              </p>
            </div>

            <button
              type="button"
              className="rounded-lg border border-border bg-surface/70 p-2 text-text2 transition hover:bg-surface hover:text-text"
              onClick={closeDrawer}
              aria-label="Close notification drawer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || isMarkingAllRead}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck size={14} />
              {isMarkingAllRead ? 'Marking...' : 'Mark all read'}
            </button>

            {isFetching ? (
              <span className="text-xs text-text3">Refreshing…</span>
            ) : null}
          </div>
        </div>

        {notificationError ? (
          <div className="border-b border-error/30 bg-error/10 px-5 py-3 text-sm text-error">
            <div className="flex items-start justify-between gap-3">
              <p>{notificationError}</p>
              <button
                type="button"
                className="rounded-md px-2 py-0.5 text-xs text-error/90 transition hover:bg-error/20"
                onClick={clearNotificationError}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {notifications.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border bg-bg3/30 px-4 py-7 text-center text-sm text-text2">
              <BellRing className="mx-auto mb-2 text-text3" size={18} />
              No notifications yet.
            </li>
          ) : null}

          {notifications.map((item) => {
            const style = severityStyles[item.severity] || severityStyles.info;
            const Icon = style.icon;
            const avatarLabel = String(item.type || item.message || 'N').charAt(0).toUpperCase();

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void handleNotificationClick(item)}
                  disabled={isMarkingRead}
                  className={`relative w-full rounded-2xl border bg-bg3/80 p-3 text-left transition hover:border-border-strong hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70 ${item.read ? 'border-border' : 'border-border-strong'}`}
                >
                  {!item.read ? (
                    <span
                      className="absolute left-0 top-3 h-[calc(100%-24px)] w-1 rounded-r-full bg-brand"
                    />
                  ) : null}

                  <div className="ml-1 flex items-start gap-3">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-semibold text-white ${style.avatar}`}
                    >
                      {avatarLabel}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
                          <Icon size={12} />
                          {item.severity}
                        </span>
                        <time className="text-xs text-text3">{formatRelativeTime(item.createdAt)}</time>
                      </div>

                      <p className="mt-2 text-sm text-text">{truncate(item.message, 120)}</p>
                      <p className="mt-1 text-xs text-text3">{item.type || 'SYSTEM_EVENT'}</p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border bg-bg2/95 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevPage}
              disabled={!pagination.hasPrev}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            <p className="text-xs text-text2">
              Page {pagination.page} of {pagination.totalPages}
            </p>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={!pagination.hasNext}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default NotificationDrawer;
