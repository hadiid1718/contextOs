const AdminLoginCard = ({ children, errorMessage, shake }) => {
  return (
    <section
      className={`relative w-full max-w-md rounded-2xl border border-[#1e2a38] bg-[#0d1117] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${
        shake ? 'animate-admin-shake' : ''
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-[#e2e8f0]">
            Stackmind
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#38bdf8]/20 text-xs font-bold text-[#38bdf8]">
              SM
            </span>
          </h1>
          <p className="mt-1 inline-flex rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#f59e0b]">
            SUPERADMIN ACCESS ONLY
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-[#f43f5e]/50 bg-[#f43f5e]/10 px-3 py-2 text-sm text-[#fda4af]">
          {errorMessage}
        </div>
      ) : null}

      {children}

      <p className="mt-4 text-xs text-[#64748b]">Unauthorized access attempts are logged.</p>
    </section>
  );
};

export default AdminLoginCard;
