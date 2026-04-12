import { Bell, Building2, Check, ChevronDown, Search, UserCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useOrg from '../hooks/useOrg';
import useNotifStore from '../store/notifStore';
import Spinner from './Spinner';

const topNavItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Query', to: '/query' },
  { label: 'Integrations', to: '/integrations' },
  { label: 'Graph', to: '/graph' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Billing', to: '/billing' },
  { label: 'Settings', to: '/settings' },
];

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { organisations, currentOrg, setActiveOrg, isLoading, selectOrgPending } = useOrg();
  const [menuOpen, setMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const orgMenuRef = useRef(null);
  const unreadCount = useNotifStore((state) => state.unreadCount);
  const toggleDrawer = useNotifStore((state) => state.toggleDrawer);
  const bellShakeNonce = useNotifStore((state) => state.bellShakeNonce);

  const activeOrgName = useMemo(() => {
    if (currentOrg?.name) return currentOrg.name;
    if (organisations?.[0]?.name) return organisations[0].name;
    return 'Select organisation';
  }, [currentOrg, organisations]);

  const activeTopNav = useMemo(() => {
    const matched = topNavItems.find(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`)
    );

    return matched?.to || '/dashboard';
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen && !orgMenuOpen) return undefined;

    const onClickOutside = (event) => {
      if (menuOpen && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }

      if (orgMenuOpen && !orgMenuRef.current?.contains(event.target)) {
        setOrgMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen, orgMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/login?loggedOut=1', { replace: true, state: { from: location.pathname } });
  };

  const handleOrgSelect = async (org) => {
    await setActiveOrg(org);
    setOrgMenuOpen(false);
  };

  const handleMobileNavChange = (event) => {
    const nextRoute = event.target.value;
    if (!nextRoute || nextRoute === activeTopNav) return;
    navigate(nextRoute);
  };

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="text-lg font-semibold text-text">
            Stackmind
          </Link>
          <div className="flex items-center gap-3 text-text2">
            <Search size={18} />
            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface/70 text-text2 transition hover:border-border-strong hover:text-text"
              onClick={toggleDrawer}
              aria-label="Open notifications"
            >
              <Bell
                key={bellShakeNonce}
                size={18}
                className={`${bellShakeNonce > 0 ? 'animate-bell-ring' : ''}`}
              />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border border-bg bg-error px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 transition hover:bg-surface"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <UserCircle2 size={18} />
                <ChevronDown
                  size={14}
                  className={`transition ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-bg2 p-2 shadow-xl">
                  <p className="mb-2 px-2 text-xs text-text3">
                    {user?.email || 'Workspace user'}
                  </p>
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

        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="md:hidden">
            <label htmlFor="mobile-module-nav" className="sr-only">
              Select module
            </label>
            <select
              id="mobile-module-nav"
              value={activeTopNav}
              onChange={handleMobileNavChange}
              className="w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text2 outline-none transition focus:border-border-strong focus:text-text"
              aria-label="Select module"
            >
              {topNavItems.map((item) => (
                <option key={item.to} value={item.to}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <nav
            className="-mx-1 hidden items-center gap-1 overflow-x-auto pb-1 md:flex"
            aria-label="Primary"
          >
            {topNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition ${
                    isActive
                      ? 'bg-brand-light text-brand'
                      : 'text-text2 hover:bg-surface hover:text-text'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="relative w-full lg:w-[280px]" ref={orgMenuRef}>
            <button
              type="button"
              className="inline-flex w-full items-center justify-between rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text2 transition hover:border-border-strong hover:bg-surface"
              onClick={() => setOrgMenuOpen((value) => !value)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2 size={16} />
                <span className="truncate">{activeOrgName}</span>
              </span>
              {isLoading ? (
                <Spinner size={3} />
              ) : (
                <ChevronDown
                  size={16}
                  className={`transition ${orgMenuOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {orgMenuOpen ? (
              <div className="animate-slide-in absolute right-0 z-20 mt-2 w-full rounded-lg border border-border bg-bg2 p-2 shadow-xl">
                {isLoading ? (
                  <div className="flex items-center justify-center p-3">
                    <Spinner size={4} />
                  </div>
                ) : null}

                {!isLoading && organisations.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-text3">No organisations yet.</p>
                ) : null}

                {!isLoading
                  ? organisations.map((org) => {
                      const isActive = currentOrg?.org_id === org.org_id;

                      return (
                        <button
                          key={org.org_id}
                          type="button"
                          disabled={selectOrgPending}
                          onClick={() => void handleOrgSelect(org)}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition ${
                            isActive
                              ? 'bg-brand-light text-brand'
                              : 'text-text2 hover:bg-surface hover:text-text'
                          }`}
                        >
                          <span className="truncate">{org.name}</span>
                          {isActive ? <Check size={14} /> : null}
                        </button>
                      );
                    })
                  : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

