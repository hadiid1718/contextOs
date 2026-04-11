import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const toneClasses = {
  healthy: 'text-[#22d3a0]',
  warning: 'text-[#f59e0b]',
  critical: 'text-[#f43f5e]',
  neutral: 'text-[#38bdf8]',
};

const GoldenSignalCard = ({
  title,
  value,
  delta = 0,
  tone = 'neutral',
  sparkData = [],
  chartType = 'bar',
}) => {
  const isPositive = Number(delta) >= 0;
  const chartData = sparkData.map((point, index) => ({ idx: index + 1, value: point }));

  return (
    <article className="rounded-2xl border border-[#1e2a38] bg-[#0d1117] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[#64748b]">{title}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-2xl font-semibold text-[#e2e8f0]">{value}</p>
        <span className={`inline-flex items-center text-xs ${toneClasses[tone] || toneClasses.neutral}`}>
          {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(Number(delta)).toFixed(1)}%
        </span>
      </div>
      <div className="mt-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <Tooltip
                cursor={false}
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#cbd5e1' }}
              />
              <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <Tooltip
                cursor={false}
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#cbd5e1' }}
              />
              <Bar dataKey="value" fill="#38bdf8" radius={[3, 3, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export default GoldenSignalCard;
