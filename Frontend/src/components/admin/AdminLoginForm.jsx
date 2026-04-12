import { Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';

const AdminLoginForm = ({ onSubmit, pending, adminEmailHint }) => {
  const [email, setEmail] = useState(adminEmailHint || '');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit?.({ email: email.trim(), password });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#64748b]">Email</span>
        <span className="flex items-center gap-2 rounded-xl border border-[#1e2a38] bg-[#131920] px-3 py-2 focus-within:border-[#38bdf8] focus-within:ring-2 focus-within:ring-[#38bdf8]/20">
          <Mail size={14} className="text-[#64748b]" />
          <input
            type="email"
            required
            disabled={pending}
            placeholder={adminEmailHint || 'superadmin@stackmind.internal'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent text-sm text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#64748b]">Password</span>
        <span className="flex items-center gap-2 rounded-xl border border-[#1e2a38] bg-[#131920] px-3 py-2 focus-within:border-[#38bdf8] focus-within:ring-2 focus-within:ring-[#38bdf8]/20">
          <LockKeyhole size={14} className="text-[#64748b]" />
          <input
            type="password"
            required
            minLength={12}
            disabled={pending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent text-sm text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
          />
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#38bdf8] px-4 py-2.5 text-sm font-semibold text-[#04121b] transition hover:shadow-[0_0_18px_rgba(56,189,248,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
        {pending ? 'Authorizing...' : 'Enter Mission Control'}
      </button>
    </form>
  );
};

export default AdminLoginForm;
