import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getBillingErrorMessage } from '../lib/billingErrors';
import billingService from '../services/billingService';
import useBillingStore from '../store/billingStore';

const useBilling = ({ orgId, invoiceLimit = 20 } = {}) => {
  const setSubscription = useBillingStore((state) => state.setSubscription);
  const setUsage = useBillingStore((state) => state.setUsage);
  const setInvoices = useBillingStore((state) => state.setInvoices);
  const subscription = useBillingStore((state) => state.subscription);
  const usage = useBillingStore((state) => state.usage);
  const invoices = useBillingStore((state) => state.invoices);

  const plansQuery = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: billingService.getPlans,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['billing', 'subscription', orgId],
    queryFn: () => billingService.getSubscription(orgId),
    enabled: Boolean(orgId),
  });

  const usageQuery = useQuery({
    queryKey: ['billing', 'usage', orgId],
    queryFn: () => billingService.getUsage(orgId),
    enabled: Boolean(orgId),
  });

  const invoicesQuery = useQuery({
    queryKey: ['billing', 'invoices', orgId, invoiceLimit],
    queryFn: () => billingService.getInvoices(orgId, invoiceLimit),
    enabled: Boolean(orgId),
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload) => billingService.createCheckoutSession(payload),
  });

  const portalMutation = useMutation({
    mutationFn: (payload) => billingService.createPortalSession(payload),
  });

  useEffect(() => {
    const value = subscriptionQuery.data?.subscription || subscriptionQuery.data?.data?.subscription || null;
    setSubscription(value);
  }, [setSubscription, subscriptionQuery.data]);

  useEffect(() => {
    const nextUsage = usageQuery.data || null;
    setUsage(nextUsage);
  }, [setUsage, usageQuery.data]);

  useEffect(() => {
    const rows = invoicesQuery.data?.invoices || invoicesQuery.data?.data?.invoices || [];
    setInvoices(rows);
  }, [invoicesQuery.data, setInvoices]);

  const startCheckout = async ({ interval = 'monthly', seats = 1 } = {}) => {
    if (!orgId) {
      throw new Error('No active organisation selected');
    }

    const payload = {
      org_id: orgId,
      seats,
      interval,
      success_url: `${window.location.origin}/settings/billing?checkout=success`,
      cancel_url: `${window.location.origin}/billing?checkout=cancelled`,
    };

    const response = await checkoutMutation.mutateAsync(payload);
    const url = response?.url || response?.data?.url;

    if (!url) {
      throw new Error('Checkout URL was not returned by the billing service.');
    }

    window.location.assign(url);
    return response;
  };

  const openPortal = async ({ returnUrl } = {}) => {
    if (!orgId) {
      throw new Error('No active organisation selected');
    }

    const response = await portalMutation.mutateAsync({
      org_id: orgId,
      return_url: returnUrl || `${window.location.origin}/settings/billing`,
    });

    const url = response?.url || response?.data?.url;
    if (!url) {
      throw new Error('Billing portal URL was not returned by the server.');
    }

    window.location.assign(url);
    return response;
  };

  const plans = plansQuery.data?.plans || plansQuery.data?.data?.plans || [];

  return {
    plans,
    subscription,
    usage,
    invoices,
    startCheckout,
    openPortal,
    isLoading:
      plansQuery.isLoading ||
      subscriptionQuery.isLoading ||
      usageQuery.isLoading ||
      invoicesQuery.isLoading,
    isLoadingPlans: plansQuery.isLoading,
    isLoadingSubscription: subscriptionQuery.isLoading,
    isLoadingUsage: usageQuery.isLoading,
    isLoadingInvoices: invoicesQuery.isLoading,
    error: subscriptionQuery.error || usageQuery.error || invoicesQuery.error || plansQuery.error,
    plansErrorMessage: getBillingErrorMessage(plansQuery.error, 'Unable to load billing plans.'),
    dataErrorMessage: getBillingErrorMessage(
      subscriptionQuery.error || usageQuery.error || invoicesQuery.error,
      'Unable to load billing information.'
    ),
    checkoutErrorMessage: getBillingErrorMessage(
      checkoutMutation.error,
      'Unable to start checkout right now.'
    ),
    portalErrorMessage: getBillingErrorMessage(
      portalMutation.error,
      'Unable to open Stripe billing portal right now.'
    ),
    checkoutPending: checkoutMutation.isPending,
    portalPending: portalMutation.isPending,
    refetchSubscription: subscriptionQuery.refetch,
    refetchUsage: usageQuery.refetch,
    refetchInvoices: invoicesQuery.refetch,
  };
};

export default useBilling;

