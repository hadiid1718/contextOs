const KafkaLagPanel = ({ topics = [] }) => {
  return (
    <section className="rounded-2xl border border-[#1e2a38] bg-[#0d1117] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cbd5e1]">Kafka Consumer Lag</h3>
      <div className="mt-4 space-y-3">
        {topics.map((topic) => {
          const width = Math.min(100, Math.max(3, Math.round((topic.lag / 6000) * 100)));
          const barClass =
            topic.status === 'critical'
              ? 'bg-[#f43f5e]'
              : topic.status === 'warning'
                ? 'bg-[#f59e0b]'
                : 'bg-[#22d3a0]';

          return (
            <div key={topic.topic} className="rounded-xl border border-[#1e2a38] bg-[#131920] px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs text-[#cbd5e1]">{topic.topic}</p>
                <span className="text-xs text-[#94a3b8]">{topic.lag.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1e293b]">
                <div className={`h-full ${barClass}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default KafkaLagPanel;
