const colorMap = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
  neutral: 'bg-surface text-text2',
};

const Badge = ({ children, tone = 'neutral' }) => {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colorMap[tone]}`}>
      {children}
    </span>
  );
};

export default Badge;

