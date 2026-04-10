import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useMemo, useState } from 'react';

const Input = forwardRef(({ label, error, className = '', enablePasswordToggle = false, type = 'text', ...props }, ref) => {
  const [revealed, setRevealed] = useState(false);
  const resolvedType = useMemo(() => {
    if (!enablePasswordToggle) return type;
    return revealed ? 'text' : 'password';
  }, [enablePasswordToggle, revealed, type]);

  return (
    <label className="block text-sm text-text2">
      {label ? <span className="mb-1 block font-medium">{label}</span> : null}
      <div className="relative">
        <input
          type={resolvedType}
          className={`w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text outline-none ring-brand transition placeholder:text-text3 focus:border-border-strong focus:ring-1 ${enablePasswordToggle ? 'pr-10' : ''} ${className}`}
          ref={ref}
          {...props}
        />
        {enablePasswordToggle ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text3 hover:text-text2"
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </div>
      {error ? <span className="mt-1 block text-xs text-error">{error}</span> : null}
    </label>
  );
});

Input.displayName = 'Input';

export default Input;

