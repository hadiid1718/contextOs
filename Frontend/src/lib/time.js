const relativeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

const divisors = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

export const formatRelativeTime = (value) => {
  if (!value) return 'just now';

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'just now';

  const delta = timestamp - Date.now();

  const best = divisors.find((entry) => Math.abs(delta) >= entry.ms) || divisors[divisors.length - 1];
  const amount = Math.round(delta / best.ms);

  return relativeFormatter.format(amount, best.unit);
};
