import Card from '../components/Card';
import { Link } from 'react-router-dom';

const Settings = () => {
  return (
    <div className="space-y-4">
      <Card title="Settings" description="Manage organisation and notification preferences.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            className="rounded-xl border border-border bg-bg3/40 px-4 py-3 text-sm text-text transition hover:border-border-strong hover:bg-surface"
            to="/settings/team"
          >
            <p className="font-medium">Team Management</p>
            <p className="mt-1 text-xs text-text2">Invite members and control organisation roles.</p>
          </Link>

          <Link
            className="rounded-xl border border-border bg-bg3/40 px-4 py-3 text-sm text-text transition hover:border-border-strong hover:bg-surface"
            to="/settings/notifications"
          >
            <p className="font-medium">Notification Preferences</p>
            <p className="mt-1 text-xs text-text2">Toggle toast/drawer categories and email digest frequency.</p>
          </Link>

          <Link
            className="rounded-xl border border-border bg-bg3/40 px-4 py-3 text-sm text-text transition hover:border-border-strong hover:bg-surface"
            to="/settings/billing"
          >
            <p className="font-medium">Billing Settings</p>
            <p className="mt-1 text-xs text-text2">Usage meter, invoices, and Stripe billing portal access.</p>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Settings;

