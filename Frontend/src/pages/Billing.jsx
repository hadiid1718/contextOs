import { ArrowRight, Building2, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import useBilling from '../hooks/useBilling';
import useOrg from '../hooks/useOrg';
import { getBillingErrorMessage } from '../lib/billingErrors';

const planFeatures = {
  free: ['100 AI queries / month', 'Up to 5 team members', 'Core dashboard modules'],
  pro: ['5,000 AI queries / month', 'Priority performance', 'Advanced notifications & support'],
  enterprise: ['Unlimited AI queries', 'Enterprise access controls', 'Dedicated success channel'],
};

const fallbackPlans = [
  {
    id: 'free',
    label: 'Free',
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    annualAvailable: true,
    annualSavingsPercent: 0,
    cta: 'current',
  },
  {
    id: 'pro',
    label: 'Pro',
    monthlyPriceUsd: 49,
    annualPriceUsd: 490,
    annualAvailable: true,
    annualSavingsPercent: 17,
    cta: 'checkout',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    monthlyPriceUsd: null,
    annualPriceUsd: null,
    annualAvailable: true,
    annualSavingsPercent: 0,
    cta: 'contact',
  },
];

const formatUsd = (value) => {
  if (value === null || value === undefined) return 'Custom';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const normalizePlanName = (value) => {
  if (!value) return 'free';
  return String(value).toLowerCase();
};

const Billing = () => {
  const [interval, setInterval] = useState('monthly');
  const [actionError, setActionError] = useState('');

  const { currentOrg, organisations } = useOrg();
  const orgId = currentOrg?.org_id || organisations?.[0]?.org_id || null;
  const orgName = currentOrg?.name || organisations?.[0]?.name || 'No organisation selected';

  const {
    plans,
    subscription,
    checkoutPending,
    checkoutErrorMessage,
    plansErrorMessage,
    startCheckout,
  } = useBilling({ orgId });

  const activePlan = normalizePlanName(subscription?.plan || 'free');

  const sortedPlans = useMemo(() => {
    const source = plans.length ? plans : fallbackPlans;
    const order = { free: 0, pro: 1, enterprise: 2 };

    return [...source].sort((a, b) => {
      const left = order[a.id] ?? 99;
      const right = order[b.id] ?? 99;
      return left - right;
    });
  }, [plans]);

  const proPlan = sortedPlans.find((plan) => plan.id === 'pro');
  const annualSavings = proPlan?.annualSavingsPercent || 0;

  const handleChoosePlan = async (planId) => {
    if (!orgId) {
      setActionError('Select an organisation before choosing a billing plan.');
      return;
    }

    if (planId !== 'pro') return;

    if (interval === 'annual' && proPlan?.annualAvailable === false) {
      setActionError('Annual billing is not available yet for this workspace.');
      return;
    }

    try {
      setActionError('');
      await startCheckout({ interval, seats: 1 });
    } catch (error) {
      setActionError(getBillingErrorMessage(error, checkoutErrorMessage));
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Choose your plan"
        description="Switch between monthly and annual billing, compare all plans, and start checkout securely with Stripe."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-text2">
            <Building2 size={16} />
            <span>{orgName}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg3 p-1">
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={`rounded-full px-3 py-1 text-sm transition ${
                interval === 'monthly'
                  ? 'bg-brand text-white'
                  : 'text-text2 hover:text-text'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('annual')}
              className={`rounded-full px-3 py-1 text-sm transition ${
                interval === 'annual'
                  ? 'bg-brand text-white'
                  : 'text-text2 hover:text-text'
              }`}
            >
              Annual
            </button>

            {annualSavings > 0 ? (
              <span
                className={`ml-1 inline-flex items-center rounded-full bg-success/20 px-2.5 py-1 text-xs font-semibold text-success transition-transform duration-300 ${
                  interval === 'annual' ? 'scale-100' : 'scale-95'
                }`}
              >
                <Sparkles size={12} className="mr-1" />
                Save {annualSavings}%
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const isCurrentPlan = activePlan === plan.id;
            const isPopular = plan.id === 'pro';
            const price = interval === 'annual' ? plan.annualPriceUsd : plan.monthlyPriceUsd;
            const periodLabel = interval === 'annual' ? '/year' : '/month';
            const disabledForAnnual =
              plan.id === 'pro' && interval === 'annual' && plan.annualAvailable === false;

            return (
              <article
                key={plan.id}
                className={`rounded-xl border p-5 transition ${
                  isPopular
                    ? 'border-brand/50 bg-brand/10'
                    : 'border-border bg-bg3/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-title-1 text-text">{plan.label}</h3>
                  {isCurrentPlan ? <Badge tone="success">Current</Badge> : null}
                </div>

                <p className="mt-3 text-3xl font-semibold text-text">
                  {plan.id === 'enterprise' ? (
                    'Contact us'
                  ) : (
                    <>
                      {formatUsd(price)}
                      <span className="ml-1 text-sm font-medium text-text3">{periodLabel}</span>
                    </>
                  )}
                </p>

                <ul className="mt-4 space-y-2 text-sm text-text2">
                  {(planFeatures[plan.id] || []).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  {plan.id === 'enterprise' ? (
                    <a
                      href="mailto:sales@contextos.io?subject=Enterprise%20Plan%20Inquiry"
                      className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-text2 transition hover:border-border-strong hover:text-text"
                    >
                      Contact sales
                    </a>
                  ) : (
                    <Button
                      type="button"
                      variant={isPopular ? 'primary' : 'secondary'}
                      disabled={isCurrentPlan || checkoutPending || disabledForAnnual}
                      onClick={() => void handleChoosePlan(plan.id)}
                    >
                      {isCurrentPlan
                        ? 'Current plan'
                        : checkoutPending && plan.id === 'pro'
                          ? 'Redirecting...'
                          : 'Choose plan'}
                      {!isCurrentPlan ? <ArrowRight size={14} className="ml-1" /> : null}
                    </Button>
                  )}
                </div>

                {disabledForAnnual ? (
                  <p className="mt-2 text-xs text-warning">Annual checkout is not configured yet.</p>
                ) : null}
              </article>
            );
          })}
        </div>

        {plansErrorMessage && !plans.length ? (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            {plansErrorMessage}
          </div>
        ) : null}

        {actionError ? (
          <div className="mt-4 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {actionError}
          </div>
        ) : null}

        {checkoutErrorMessage && !actionError ? (
          <div className="mt-4 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {checkoutErrorMessage}
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default Billing;

