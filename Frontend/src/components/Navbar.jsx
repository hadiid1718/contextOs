import { Menu, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const navItems = [
  { label: 'About', to: '/#about' },
  { label: 'How To Use', to: '/#how-to-use' },
  { label: 'Modules', to: '/#modules' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Contact', to: '/contact' },
];

const Navbar = ({ isPublic = false }) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const isHomeRoute = location.pathname === '/';
  const activeHash = useMemo(() => {
    return isHomeRoute ? location.hash || '#about' : '';
  }, [isHomeRoute, location.hash]);

  const isActive = (to) => {
    if (to.startsWith('/#')) {
      return isHomeRoute && activeHash === to.slice(1);
    }
    return location.pathname === to;
  };

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/login?loggedOut=1', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-strong bg-surface2 font-mono text-sm font-bold text-brand">
            CO
          </div>
          <span className="text-base font-semibold text-text">ContextOS</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm font-medium transition ${isActive(item.to) ? 'text-brand' : 'text-text2 hover:text-text'}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isPublic && !isAuthenticated ? (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-text2 transition hover:text-text"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-lg border border-border-strong bg-brand px-4 py-2 text-sm font-semibold text-bg transition hover:bg-brand-dark"
              >
                Get started
              </Link>
            </>
          ) : (
            <Link
              to="/dashboard"
              className="text-sm font-medium text-brand transition hover:text-accent2"
            >
              Dashboard
            </Link>
          )}
          {isPublic && isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-error transition hover:text-error/80"
            >
              Logout
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="rounded-md border border-border p-2 text-text md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-border bg-bg2 px-4 py-4 sm:px-6">
          <div className="space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-text2 hover:text-text"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border pt-3">
              {isPublic && !isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className="block py-2 text-sm font-medium text-text2 hover:text-text"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="block rounded-lg border border-border-strong bg-brand px-4 py-2 text-center text-sm font-semibold text-bg transition hover:bg-brand-dark"
                  >
                    Get started
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="block text-sm font-medium text-brand hover:text-accent2"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {isPublic && isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 block text-sm font-medium text-error"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Navbar;

