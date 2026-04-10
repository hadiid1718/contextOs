const variants = {
  primary: 'border border-border-strong bg-brand text-bg hover:bg-brand-dark',
  secondary: 'border border-border bg-surface text-text hover:bg-surface2',
  ghost: 'bg-transparent text-text2 hover:bg-surface',
};

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

