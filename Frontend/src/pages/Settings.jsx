import Card from '../components/Card';
import { Link } from 'react-router-dom';

const Settings = () => {
  return (
    <Card title="Settings" description="Manage organization profile and preferences.">
      <p className="text-sm text-text2">Team management is available in the dedicated settings module.</p>
      <Link className="mt-3 inline-flex text-sm font-medium text-brand hover:text-brand-dark" to="/settings/team">
        Open Team Management
      </Link>
    </Card>
  );
};

export default Settings;

