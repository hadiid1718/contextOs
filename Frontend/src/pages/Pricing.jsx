import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'For individuals and early teams getting started.',
    features: ['5 team members', '100 AI queries/month', 'Basic integrations', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: 'For growing teams shipping with AI workflows.',
    features: ['Unlimited members', '5,000 AI queries/month', 'All integrations', 'Priority support', 'Advanced analytics'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'For large organizations with advanced governance.',
    features: ['Everything in Pro', 'Unlimited AI queries', 'Custom integrations', 'Dedicated support', 'SLA guarantee'],
  },
];

const STORAGE_KEY = 'contextos-pricing-selection';

const readStoredSelection = () => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return { billingCycle: 'monthly', selectedPlanId: 'pro' };
    const parsed = JSON.parse(value);
    return {
      billingCycle: parsed?.billingCycle === 'yearly' ? 'yearly' : 'monthly',
      selectedPlanId: parsed?.selectedPlanId || 'pro',
    };
  } catch {
    return { billingCycle: 'monthly', selectedPlanId: 'pro' };
  }
};

const formatPrice = (price, billingCycle) => {
  if (price === null) return 'Custom';
  if (price === 0) return 'Free';
  return `$${price}/${billingCycle === 'monthly' ? 'mo' : 'mo, billed yearly'}`;
};

const Pricing = () => {
  const initial = useMemo(() => readStoredSelection(), []);
  const [billingCycle, setBillingCycle] = useState(initial.billingCycle);
  const [selectedPlanId, setSelectedPlanId] = useState(initial.selectedPlanId);

  const persistSelection = (nextCycle, nextPlanId) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ billingCycle: nextCycle, selectedPlanId: nextPlanId }),
      );
    } catch {
      // Ignore storage failures to keep UI functional in restricted environments.
    }
  };

  const handleCycleChange = (cycle) => {
    setBillingCycle(cycle);
    persistSelection(cycle, selectedPlanId);
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
    persistSelection(billingCycle, planId);
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar isPublic />

      <section className="section-divider px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="section-label">Pricing</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Choose your plan</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-text2">
              Toggle billing and select one plan that matches your team. Your selected plan is highlighted.
            </p>
          </div>

          <div className="mx-auto mt-8 flex w-fit items-center rounded-full border border-border bg-bg2 p-1">
            <button
              type="button"
              onClick={() => handleCycleChange('monthly')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                billingCycle === 'monthly' ? 'bg-brand text-bg' : 'text-text2 hover:text-text'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => handleCycleChange('yearly')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                billingCycle === 'yearly' ? 'bg-brand text-bg' : 'text-text2 hover:text-text'
              }`}
            >
              Yearly
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const activePrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              const isSelected = selectedPlanId === plan.id;

              return (
                <article
                  key={plan.id}
                  className={`rounded-xl border bg-bg2 p-6 transition ${
                    isSelected ? 'border-border-strong bg-bg3' : 'border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    {plan.recommended ? (
                      <span className="rounded-full bg-accent2/20 px-2 py-1 text-xs font-medium text-accent2">
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm text-text2">{plan.description}</p>

                  <p className="mt-4 text-2xl font-semibold">{formatPrice(activePrice, billingCycle)}</p>

                  <ul className="mt-5 space-y-2 text-sm text-text2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check size={14} className="mt-[2px] text-accent2" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    className="mt-6 w-full"
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {isSelected ? 'Selected' : plan.id === 'enterprise' ? 'Contact Sales' : 'Select Plan'}
                  </Button>
                </article>
              );
            })}
          </div>

          <div className="mt-10 text-center text-sm text-text2">
            Selected plan:{' '}
            <span className="font-semibold text-text">
              {plans.find((plan) => plan.id === selectedPlanId)?.name || 'None'}
            </span>
          </div>

          <div className="mt-8 text-center">
            <Link to="/register" className="text-sm font-medium text-brand transition hover:text-brand-dark">
              Continue to create your account
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;

