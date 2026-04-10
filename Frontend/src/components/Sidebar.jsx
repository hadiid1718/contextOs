import { BarChart3, Bell, Cable, LayoutDashboard, Settings, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import OrgSwitcher from './OrgSwitcher';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Query', to: '/query', icon: BarChart3 },
  { label: 'Integrations', to: '/integrations', icon: Cable },
  { label: 'Graph', to: '/graph', icon: BarChart3 },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Billing', to: '/billing', icon: Wallet },
  { label: 'Settings', to: '/settings/team', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="hidden w-64 shrink-0 rounded-xl border border-border bg-bg2 p-4 md:block">
      <h2 className="mb-4 section-label">ContextOS</h2>
      <OrgSwitcher />
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                  isActive ? 'bg-brand-light text-brand' : 'text-text2 hover:bg-surface hover:text-text'
                }`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

