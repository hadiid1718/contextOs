import Badge from '../Badge';

const statusTone = {
  nominal: 'success',
  slow: 'warning',
  down: 'error',
};

const ServiceHealthPanel = ({ services = [], onSelectService }) => {
  return (
    <section className="rounded-2xl border border-[#1e2a38] bg-[#0d1117] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cbd5e1]">Service Health</h3>
      <div className="mt-4 space-y-3">
        {services.map((service) => {
          const width = Math.min(100, Math.max(5, Math.round((service.latencyMs / 500) * 100)));

          return (
            <button
              key={service.id}
              type="button"
              className="w-full rounded-xl border border-[#1e2a38] bg-[#131920] px-3 py-3 text-left transition hover:border-[#38bdf8]/40"
              onClick={() => onSelectService?.(service.name)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      service.status === 'nominal'
                        ? 'bg-[#22d3a0]'
                        : service.status === 'slow'
                          ? 'bg-[#f59e0b]'
                          : 'bg-[#f43f5e]'
                    }`}
                  />
                  <span className="font-mono text-sm uppercase text-[#e2e8f0]">{service.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#94a3b8]">{service.latencyMs}ms</span>
                  <Badge tone={statusTone[service.status] || 'neutral'}>{service.status}</Badge>
                </div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1e293b]">
                <div
                  className={`h-full transition-all duration-500 ${
                    service.status === 'nominal'
                      ? 'bg-[#22d3a0]'
                      : service.status === 'slow'
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#f43f5e]'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ServiceHealthPanel;
