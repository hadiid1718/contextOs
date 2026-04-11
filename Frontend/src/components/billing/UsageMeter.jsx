import { useEffect, useMemo, useState } from 'react';

const formatResetDate = (value) => {
  if (!value) return 'Unknown reset date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown reset date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const UsageMeter = ({ used = 0, limit = 0, periodEnd }) => {
  const safeUsed = Number.isFinite(Number(used)) ? Number(used) : 0;
  const safeLimit = Number.isFinite(Number(limit)) ? Number(limit) : 0;
  const isUnlimited = safeLimit === 0;

  const targetPercent = useMemo(() => {
    if (isUnlimited) return 0;
    const raw = (safeUsed / Math.max(safeLimit, 1)) * 100;
    return Math.min(100, Math.max(0, raw));
  }, [isUnlimited, safeLimit, safeUsed]);

  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setAnimatedPercent(targetPercent);
    });

    return () => cancelAnimationFrame(raf);
  }, [targetPercent]);

  const meterToneClass =
    targetPercent >= 95
      ? 'bg-error'
      : targetPercent >= 80
        ? 'bg-warning'
        : 'bg-brand';

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <p className="text-sm text-text2">
          {isUnlimited
            ? `${safeUsed.toLocaleString()} queries used (unlimited plan)`
            : `${safeUsed.toLocaleString()} / ${safeLimit.toLocaleString()} queries used`}
        </p>
        <p className="text-xs font-medium text-text3">
          {isUnlimited ? 'Unlimited' : `${Math.round(targetPercent)}%`}
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full border border-border bg-bg3">
        <div
          className={`h-full origin-left rounded-full transition-[width] duration-700 ease-out ${meterToneClass}`}
          style={{ width: `${animatedPercent}%` }}
        />
      </div>

      <p className="text-xs text-text3">Estimated reset: {formatResetDate(periodEnd)}</p>
    </div>
  );
};

export default UsageMeter;
