import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import billingService from '../services/billingService';
import useBillingStore from '../store/billingStore';

const useBilling = () => {
  const setSubscription = useBillingStore((state) => state.setSubscription);
  const subscription = useBillingStore((state) => state.subscription);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription'],
    queryFn: billingService.getSubscription,
  });

  useEffect(() => {
    const value = subscriptionQuery.data?.data || subscriptionQuery.data || null;
    setSubscription(value);
  }, [setSubscription, subscriptionQuery.data]);

  return {
    subscription,
    isLoading: subscriptionQuery.isLoading,
    error: subscriptionQuery.error,
  };
};

export default useBilling;

