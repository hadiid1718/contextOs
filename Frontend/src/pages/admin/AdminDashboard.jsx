import { formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import GoldenSignalCard from '../../components/admin/GoldenSignalCard';
import KafkaLagPanel from '../../components/admin/KafkaLagPanel';
import LogExplorer from '../../components/admin/LogExplorer';
import OrgRateLimitPanel from '../../components/admin/OrgRateLimitPanel';
import PodGrid from '../../components/admin/PodGrid';
import RedisStatsPanel from '../../components/admin/RedisStatsPanel';
import SecurityAlertPanel from '../../components/admin/SecurityAlertPanel';
import ServiceHealthPanel from '../../components/admin/ServiceHealthPanel';
import TopBar from '../../components/admin/TopBar';
import useAdminAuth from '../../hooks/useAdminAuth';
import useAdminStore from '../../store/adminStore';

const computeDelta = (history = []) => {
  if (!Array.isArray(history) || history.length < 2) return 0;

  const latest = Number(history[history.length - 1]) || 0;
  const previous = Number(history[history.length - 2]) || 0;
  if (previous === 0) return 0;

  return ((latest - previous) / previous) * 100;
};

const toneForErrorRate = (value) => {
  if (value > 3) return 'critical';
  if (value >= 1) return 'warning';
  return 'healthy';
};

const toneForLatency = (value) => {
  if (value > 500) return 'critical';
  if (value >= 200) return 'warning';
  return 'healthy';
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const {
    goldenSignals,
    serviceHealth,
    orgRateLimits,
    kafkaLag,
    redisStats,
    logEntries,
    alerts,
    podCounts,
    logQuery,
    logPaused,
    lastUpdated,
    isRefreshing,
    error,
    setLogQuery,
    setLogPaused,
    refreshData,
  } = useAdminStore(
    useShallow((state) => ({
      goldenSignals: state.goldenSignals,
      serviceHealth: state.serviceHealth,
      orgRateLimits: state.orgRateLimits,
      kafkaLag: state.kafkaLag,
      redisStats: state.redisStats,
      logEntries: state.logEntries,
      alerts: state.alerts,
      podCounts: state.podCounts,
      logQuery: state.logQuery,
      logPaused: state.logPaused,
      lastUpdated: state.lastUpdated,
      isRefreshing: state.isRefreshing,
      error: state.error,
      setLogQuery: state.setLogQuery,
      setLogPaused: state.setLogPaused,
      refreshData: state.refreshData,
    })),
  );

  const jitterTimersRef = useRef([]);
  const [selectedService, setSelectedService] = useState('');

  useEffect(() => {
    void refreshData();

    const interval = setInterval(() => {
      const jitterMs = Math.floor(Math.random() * 700);
      const timeout = setTimeout(() => {
        void refreshData();
      }, jitterMs);
      jitterTimersRef.current.push(timeout);
    }, 5000);

    return () => {
      clearInterval(interval);
      jitterTimersRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      jitterTimersRef.current = [];
    };
  }, [refreshData]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return 'never';
    return formatDistanceToNowStrict(new Date(lastUpdated), { addSuffix: true });
  }, [lastUpdated]);

  const handleServiceDrillDown = (serviceName) => {
    setSelectedService(serviceName);
    setLogQuery(serviceName);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const reqDelta = computeDelta(goldenSignals.history);
  const errorRateDelta = Number(((goldenSignals.errorRate || 0) - 1.5).toFixed(2));
  const latencyDelta = Number((((goldenSignals.p95Latency || 0) - 240) / 240 * 100).toFixed(2));
  const activeOrgsDelta = Number((((goldenSignals.activeOrgs || 0) - 100) / 100 * 100).toFixed(2));

  return (
    <div className="admin-shell admin-grid-overlay min-h-screen bg-[#070a10] text-[#e2e8f0]">
      <TopBar alertsCount={alerts.length} onLogout={handleLogout} />

      <div className="mx-auto w-full max-w-[1320px] px-4 pb-8 pt-24 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#94a3b8]">
          <div>
            Last updated {lastUpdatedLabel}
            {isRefreshing ? ' - refreshing...' : ''}
          </div>
          {selectedService ? (
            <div className="rounded-full border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-3 py-1 text-[#38bdf8]">
              Drill-down focus: {selectedService}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-[#f43f5e]/40 bg-[#f43f5e]/10 px-3 py-2 text-sm text-[#fda4af]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <GoldenSignalCard
            title="Requests/min"
            value={goldenSignals.reqPerMin?.toLocaleString() || '0'}
            delta={reqDelta}
            tone="neutral"
            chartType="bar"
            sparkData={goldenSignals.history || []}
          />
          <GoldenSignalCard
            title="Error Rate"
            value={`${Number(goldenSignals.errorRate || 0).toFixed(2)}%`}
            delta={errorRateDelta}
            tone={toneForErrorRate(goldenSignals.errorRate || 0)}
            chartType="line"
            sparkData={goldenSignals.history || []}
          />
          <GoldenSignalCard
            title="P95 Latency"
            value={`${goldenSignals.p95Latency || 0} ms`}
            delta={latencyDelta}
            tone={toneForLatency(goldenSignals.p95Latency || 0)}
            chartType="bar"
            sparkData={serviceHealth.map((item) => item.latencyMs)}
          />
          <GoldenSignalCard
            title="Active Orgs"
            value={goldenSignals.activeOrgs || 0}
            delta={activeOrgsDelta}
            tone="healthy"
            chartType="line"
            sparkData={goldenSignals.history || []}
          />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <ServiceHealthPanel services={serviceHealth} onSelectService={handleServiceDrillDown} />
          <SecurityAlertPanel alerts={alerts} />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <OrgRateLimitPanel rows={orgRateLimits} />
          <div className="space-y-4">
            <KafkaLagPanel topics={kafkaLag} />
            <RedisStatsPanel stats={redisStats} />
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          <LogExplorer
            entries={logEntries}
            query={logQuery}
            onQueryChange={setLogQuery}
            paused={logPaused}
            onTogglePause={() => setLogPaused(!logPaused)}
          />
          <PodGrid podCounts={podCounts} />
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
