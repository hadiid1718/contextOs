const billingErrors = {
  400: 'Billing request is invalid. Please refresh and try again.',
  401: 'Your session expired. Please sign in again.',
  403: 'You do not have permission to manage billing for this organisation.',
  404: 'Billing record was not found for this organisation.',
  409: 'Billing state changed recently. Please refresh and try again.',
  429: 'Usage limit reached. Upgrade to continue.',
  502: 'Billing provider is temporarily unavailable. Please try again shortly.',
  503: 'Billing service is currently unavailable or not configured.',
};

export const getBillingErrorMessage = (error, fallback = 'Unable to complete billing request right now.') => {
  if (!error) return fallback;

  const status = error?.response?.status || error?.status;
  const responseMessage = error?.response?.data?.message;
  const detailsMessage = error?.response?.data?.details?.reason;

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }

  if (typeof detailsMessage === 'string' && detailsMessage.trim()) {
    return detailsMessage;
  }

  if (status && billingErrors[status]) {
    return billingErrors[status];
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
