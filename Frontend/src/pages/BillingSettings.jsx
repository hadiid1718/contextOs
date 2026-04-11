import { AlertTriangle, ArrowUpRight, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import InvoiceHistoryTable from '../components/billing/InvoiceHistoryTable';
import UsageMeter from '../components/billing/UsageMeter';
import useBilling from '../hooks/useBilling';
import useOrg from '../hooks/useOrg';
import { getBillingErrorMessage } from '../lib/billingErrors';

const toTitle = (value) => {
  if (!value) return 'Free';
  return String(value)
    .split('_')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
};

const BillingSettings = () => {
  const { currentOrg, organisations } = useOrg();
  const orgId = currentOrg?.org_id || organisations?.[0]?.org_id || null;
  const orgName = currentOrg?.name || organisations?.[0]?.name || 'No organisation selected';

  const {
    subscription,
    usage,
    invoices,
    isLoadingSubscription,
    isLoadingUsage,
    isLoadingInvoices,
    dataErrorMessage,
    portalErrorMessage,
    portalPending,
    openPortal,
  } = useBilling({ orgId });

  const [actionError, setActionError] = useState('');

  const handleOpenPortal = async () => {
    try {
      setActionError('');
      await openPortal();
    } catch (error) {
      setActionError(getBillingErrorMessage(error, portalErrorMessage));
    }
  };

  const plan = subscription?.plan || 'free';
  const status = subscription?.status || 'active';

  return (
    <div className="space-y-6">
      <Card
        title="Billing Settings"
        description="Track usage, manage your Stripe billing portal, and review invoice history."
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4 rounded-xl border border-border bg-bg3/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text3">Current plan</p>
                <h2 className="mt-1 text-title-1 text-text">{toTitle(plan)}</h2>
                <p className="mt-1 text-sm text-text2">Organisation: {orgName}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge tone={plan === 'pro' || plan === 'enterprise' ? 'success' : 'neutral'}>
                  Plan: {toTitle(plan)}
                </Badge>
                <Badge tone={status === 'active' || status === 'trialing' ? 'success' : 'warning'}>
                  Status: {toTitle(status)}
                </Badge>
              </div>
            </div>

            {isLoadingUsage ? (
              <p className="text-sm text-text2">Loading usage...</p>
            ) : (
              <UsageMeter
                used={usage?.usageCount || 0}
                limit={usage?.limit || 0}
                periodEnd={usage?.periodEnd || subscription?.currentPeriodEnd}
              />
            )}

            <div className="flex flex-wrap gap-2">
              <Link to="/billing">
                <Button type="button">
                  Upgrade plan
                  <ArrowUpRight size={14} className="ml-1" />
                </Button>
              </Link>

              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleOpenPortal()}
                disabled={portalPending || !orgId}
              >
                <CreditCard size={14} className="mr-2" />
                {portalPending ? 'Opening portal...' : 'Manage Billing'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg3/30 p-4">
            <p className="text-sm font-semibold text-text">Usage policy</p>
            <ul className="mt-3 space-y-2 text-sm text-text2">
              <li>Usage meter shifts to amber at 80% and red at 95%.</li>
              <li>When the AI query limit is hit, the app shows an upgrade modal.</li>
              <li>Annual billing unlocks savings when configured.</li>
            </ul>
          </div>
        </div>

        {actionError ? (
          <div className="mt-4 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {actionError}
          </div>
        ) : null}

        {!orgId ? (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            Select an organisation first to manage billing.
          </div>
        ) : null}

        {(isLoadingSubscription || (!isLoadingSubscription && dataErrorMessage && !subscription)) ? (
          <div className="mt-4 rounded-lg border border-border bg-bg3/40 px-3 py-2 text-sm text-text2">
            {isLoadingSubscription ? 'Loading subscription...' : dataErrorMessage}
          </div>
        ) : null}
      </Card>

      <Card
        title="Invoice History"
        description="Invoices generated through Stripe billing for the active organisation."
      >
        {dataErrorMessage && !isLoadingInvoices ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{dataErrorMessage}</span>
          </div>
        ) : null}

        <InvoiceHistoryTable invoices={invoices} isLoading={isLoadingInvoices} />
      </Card>
    </div>
  );
};

export default BillingSettings;
