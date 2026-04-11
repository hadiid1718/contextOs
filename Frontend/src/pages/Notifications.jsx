import { BellRing, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import useNotifications from '../hooks/useNotifications';
import { formatRelativeTime } from '../lib/time';
import useNotifStore from '../store/notifStore';

const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllRead, isMarkingAllRead } =
    useNotifications();
  const setDrawerOpen = useNotifStore((state) => state.setDrawerOpen);

  const openDrawer = () => {
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-bg3 via-bg2 to-bg2 p-6">
        <div className="absolute right-[-100px] top-[-90px] h-52 w-52 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute left-[-70px] bottom-[-80px] h-44 w-44 rounded-full bg-accent2/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-1 text-title-1 text-text">Notification Service</h1>
            <p className="mt-2 text-sm text-text2">
              Realtime alerts across auth, org, and system events with toast + drawer interactions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openDrawer}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text transition hover:bg-surface2"
            >
              <BellRing size={16} />
              Open Drawer
            </button>

            <Link
              to="/settings/notifications"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text transition hover:bg-surface2"
            >
              <Settings2 size={16} />
              Notification Settings
            </Link>
          </div>
        </div>
      </section>

      <Card
        title="Recent Activity"
        description={`${unreadCount} unread notifications currently in your workspace.`}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0 || isMarkingAllRead}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMarkingAllRead ? 'Marking...' : 'Mark all read'}
          </button>
        </div>

        <ul className="space-y-2 text-sm text-text2">
          {notifications.length === 0 ? (
            <li className="rounded-xl border border-dashed border-border bg-bg3/30 px-4 py-6 text-center">
              No notifications yet.
            </li>
          ) : null}

          {notifications.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border px-4 py-3 ${item.read ? 'border-border bg-bg3/30' : 'border-border-strong bg-bg3/70'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-text">{item.message}</p>
                  <p className="mt-1 text-xs text-text3">
                    {item.type || 'SYSTEM_EVENT'} • {formatRelativeTime(item.createdAt)}
                  </p>
                </div>

                {!item.read ? (
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-xs text-text2 transition hover:border-border-strong hover:text-text"
                    onClick={() => void markAsRead(item.id)}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default Notifications;

