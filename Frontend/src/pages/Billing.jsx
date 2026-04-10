import Badge from '../components/Badge';
import Card from '../components/Card';
import useBilling from '../hooks/useBilling';

const Billing = () => {
  const { subscription } = useBilling();

  return (
    <Card title="Billing" description="Subscription and payment status.">
      <div className="flex items-center gap-2 text-sm text-text2">
        <span>Current plan:</span>
        <Badge tone="success">{subscription?.plan || 'Free'}</Badge>
      </div>
    </Card>
  );
};

export default Billing;

