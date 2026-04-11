import { ADMIN_SERVICES } from '../../types/admin';

const PodGrid = ({ podCounts = {} }) => {
  const services = ADMIN_SERVICES.map((service) => ({
    service,
    status: podCounts[service] || { desired: 0, ready: 0, scaling: false },
  }));

  const totalDesired = services.reduce((sum, item) => sum + Number(item.status.desired || 0), 0);
  const totalReady = services.reduce((sum, item) => sum + Number(item.status.ready || 0), 0);

  return (
    <section className="rounded-xl border border-[#1e2a38] bg-[#0d1117] p-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cbd5e1]">K8s Pod Grid</h3>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((item) => {
          const desired = Number(item.status.desired || 0);
          const ready = Number(item.status.ready || 0);
          const scaling = Boolean(item.status.scaling);

          return (
            <article key={item.service} className="rounded-lg border border-[#1e2a38] bg-[#131920] px-2.5 py-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#e2e8f0]">{item.service}</p>
              <p className="mt-1 text-[11px] text-[#94a3b8]">
                {ready} / {desired}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {Array.from({ length: Math.max(desired, 1) }, (_, index) => {
                  const dotClass =
                    index < ready
                      ? 'bg-[#22d3a0]'
                      : scaling
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#f43f5e]';

                  return <span key={index} className={`h-2 w-2 rounded-full ${dotClass}`} />;
                })}
              </div>
              {scaling ? <p className="mt-1.5 text-[10px] text-[#f59e0b]">Scaling in progress</p> : null}
            </article>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-[#1e2a38] bg-[#131920] px-2.5 py-1.5 text-[11px] text-[#94a3b8]">
        Total: {totalReady} / {totalDesired} pods | HPA max: 10 | Region: us-east-1 | Last scale: 4m ago
      </div>
    </section>
  );
};

export default PodGrid;
