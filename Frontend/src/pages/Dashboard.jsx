import {
  Activity,
  ArrowRight,
  BellRing,
  BrainCircuit,
  Cable,
  ChartNoAxesCombined,
  GitBranch,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../components/Badge';
import Card from '../components/Card';
import useOrg from '../hooks/useOrg';
import { formatRelativeTime } from '../lib/time';
import useNotifStore from '../store/notifStore';

const quickActions = [
  {
    title: 'Integrations',
    description: 'Manage ingestion sources and credentials.',
    to: '/integrations',
    icon: Cable,
  },
  {
    title: 'Graph',
    description: 'Inspect causal links and relationship clusters.',
    to: '/graph',
    icon: GitBranch,
  },
  {
    title: 'Query',
    description: 'Ask contextual questions across your workspace.',
    to: '/query',
    icon: BrainCircuit,
  },
  {
    title: 'Billing',
    description: 'Review usage and active subscription status.',
    to: '/billing',
    icon: Wallet,
  },
];

const moduleCards = [
  {
    title: 'Ingestion',
    blurb: 'Pipelines ready for incoming external events.',
    tone: 'success',
    status: 'Ready',
    icon: Cable,
    to: '/integrations',
  },
  {
    title: 'Knowledge Graph',
    blurb: 'Relationship map synced with latest entities.',
    tone: 'success',
    status: 'Healthy',
    icon: GitBranch,
    to: '/graph',
  },
  {
    title: 'AI Query',
    blurb: 'Context retrieval and streamed answer generation.',
    tone: 'success',
    status: 'Online',
    icon: BrainCircuit,
    to: '/query',
  },
  {
    title: 'Notifications',
    blurb: 'Realtime bell, drawer, and toast pipeline.',
    tone: 'warning',
    status: 'Watching',
    icon: BellRing,
    to: '/notifications',
  },
  {
    title: 'Billing',
    blurb: 'Usage metering and plan enforcement module.',
    tone: 'neutral',
    status: 'Active',
    icon: Wallet,
    to: '/billing',
  },
  {
    title: 'Security',
    blurb: 'Token auth and organisation scoped access.',
    tone: 'success',
    status: 'Protected',
    icon: ShieldCheck,
    to: '/settings/team',
  },
];

const Dashboard = () => {
  const { currentOrg, organisations } = useOrg();
  const unreadCount = useNotifStore((state) => state.unreadCount);
  const notifications = useNotifStore((state) => state.notifications);

  const activeOrgName =
    currentOrg?.name || organisations?.[0]?.name || 'No organisation selected';
  const latestEvent = notifications?.[0] || null;

  const getSeverityTone = (severity) => {
    if (severity === 'error') return 'error';
    if (severity === 'warning') return 'warning';
    if (severity === 'success') return 'success';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-bg3 via-bg2 to-bg2 p-6">
        <div className="absolute right-[-100px] top-[-120px] h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute left-[-80px] bottom-[-120px] h-56 w-56 rounded-full bg-accent2/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-text3">Dashboard</p>
            <h1 className="mt-1 text-display-1 text-text">Operational Overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-text2">
              Central view for {activeOrgName}. Use the top tabs to switch modules and the organisation selector to refresh context-aware content.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Org: {activeOrgName}</Badge>
            <Badge tone={unreadCount > 0 ? 'warning' : 'success'}>
              Alerts: {unreadCount > 0 ? `${unreadCount} unread` : 'No unread'}
            </Badge>
            <Badge tone="neutral">
              Last event: {latestEvent ? formatRelativeTime(latestEvent.createdAt) : 'No events'}
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Active Organization" description="Current workspace context.">
          <p className="text-lg font-semibold text-text">{activeOrgName}</p>
        </Card>
        <Card title="Unread Notifications" description="Bell drawer unread count.">
          <p className="text-lg font-semibold text-text">{unreadCount}</p>
        </Card>
        <Card title="Modules Available" description="Core platform modules exposed.">
          <p className="text-lg font-semibold text-text">{moduleCards.length}</p>
        </Card>
        <Card title="Recent Activity" description="Latest event timestamp.">
          <p className="text-lg font-semibold text-text">
            {latestEvent ? formatRelativeTime(latestEvent.createdAt) : 'No events'}
          </p>
        </Card>
      </div>

      <Card
        title="Quick Actions"
        description="Jump directly to the module you want to work on."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                to={action.to}
                className="group rounded-xl border border-border bg-bg3/50 p-4 transition hover:border-border-strong hover:bg-surface"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-brand" />
                    <p className="text-sm font-medium text-text">{action.title}</p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-text3 transition group-hover:translate-x-1 group-hover:text-text"
                  />
                </div>
                <p className="mt-2 text-xs text-text2">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card
        title="Module Health"
        description="Operational snapshot for each core service in the selected organisation context."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moduleCards.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.title}
                to={module.to}
                className="group rounded-xl border border-border bg-bg3/40 p-4 transition hover:border-border-strong hover:bg-surface"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-text">
                    <Icon size={16} className="text-brand" />
                    <h3 className="text-sm font-semibold">{module.title}</h3>
                  </div>
                  <Badge tone={module.tone}>{module.status}</Badge>
                </div>
                <p className="mt-3 text-xs text-text2">{module.blurb}</p>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card
          title="Recent Signals"
          description="Latest cross-module events available for the selected organisation."
        >
          {notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg3/30 px-4 py-6 text-sm text-text2">
              No signals yet. As events arrive, this feed will render a timeline here.
            </div>
          ) : (
            <ul className="space-y-3">
              {notifications.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-bg3/50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-text">{item.message}</p>
                    <Badge tone={getSeverityTone(item.severity)}>
                      {item.severity || 'info'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-text3">
                    {item.type || 'SYSTEM_EVENT'} • {formatRelativeTime(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Insight Summary"
          description="Fast executive signal of system posture in this context."
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-bg3/50 p-4">
              <div className="inline-flex items-center gap-2 text-text">
                <ChartNoAxesCombined size={16} className="text-brand" />
                <p className="text-sm font-semibold">Signal Density</p>
              </div>
              <p className="mt-2 text-xs text-text2">
                {notifications.length > 0
                  ? `${notifications.length} tracked notifications currently loaded in memory.`
                  : 'No signal density detected yet.'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-bg3/50 p-4">
              <div className="inline-flex items-center gap-2 text-text">
                <Activity size={16} className="text-brand" />
                <p className="text-sm font-semibold">Operational Focus</p>
              </div>
              <p className="mt-2 text-xs text-text2">
                {unreadCount > 0
                  ? `Prioritize ${unreadCount} unread alerts to stabilize the workspace state.`
                  : 'No urgent alerts. Continue with proactive graph and query reviews.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

