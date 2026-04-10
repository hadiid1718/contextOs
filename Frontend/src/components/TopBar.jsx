import { Bell, ChevronDown, Search, UserCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/login?loggedOut=1', { replace: true, state: { from: location.pathname } });
  };

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="text-lg font-semibold text-text">
          ContextOS
        </Link>
        <div className="flex items-center gap-3 text-text2">
          <Search size={18} />
          <Bell size={18} />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 transition hover:bg-surface"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <UserCircle2 size={18} />
              <ChevronDown size={14} className={`transition ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-bg2 p-2 shadow-xl">
                <p className="mb-2 px-2 text-xs text-text3">{user?.email || 'Workspace user'}</p>
                <Link
                  to="/dashboard"
                  className="block rounded-md px-2 py-2 text-sm text-text2 transition hover:bg-surface hover:text-text"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="mt-1 block w-full rounded-md px-2 py-2 text-left text-sm text-error transition hover:bg-error/10"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

