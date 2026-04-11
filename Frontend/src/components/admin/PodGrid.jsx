import { ADMIN_SERVICES } from '../../types/admin';

const PodGrid = ({ podCounts = {} }) => {
  const services = ADMIN_SERVICES.map((service) => ({
    service,
    status: podCounts[service] || { desired: 0, ready: 0, scaling: false },
  }));

  const totalDesired = services.reduce((sum, item) => sum + Number(item.status.desired || 0), 0);
  const totalReady = services.reduce((sum, item) => sum + Number(item.status.ready || 0), 0);

  return (
    <section className="rounded-2xl border border-[#1e2a38] bg-[#0d1117] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cbd5e1]">K8s Pod Grid</h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((item) => {
          const desired = Number(item.status.desired || 0);
          const ready = Number(item.status.ready || 0);
          const scaling = Boolean(item.status.scaling);

          return (
            <article key={item.service} className="rounded-xl border border-[#1e2a38] bg-[#131920] px-3 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#e2e8f0]">{item.service}</p>
              <p className="mt-1 text-xs text-[#94a3b8]">
                {ready} / {desired}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: Math.max(desired, 1) }, (_, index) => {
                  const dotClass =
                    index < ready
                      ? 'bg-[#22d3a0]'
                      : scaling
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#f43f5e]';

                  return <span key={index} className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />;
                })}
              </div>
              {scaling ? <p className="mt-2 text-[11px] text-[#f59e0b]">Scaling in progress</p> : null}
            </article>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[#1e2a38] bg-[#131920] px-3 py-2 text-xs text-[#94a3b8]">
        Total: {totalReady} / {totalDesired} pods | HPA max: 10 | Region: us-east-1 | Last scale: 4m ago
      </div>
    </section>
  );
};

export default PodGrid;
