export const normalizeNotificationError = (
  error,
  fallbackMessage = 'Unable to complete the notification action.'
) => {
  if (!error) return fallbackMessage;

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.details) {
    return error.response.data.details;
  }

  if (error?.response?.status === 401) {
    return 'Your session expired. Please sign in again to continue.';
  }

  if (error?.response?.status === 403) {
    return 'You are not allowed to perform this notification action.';
  }

  if (error?.response?.status === 404) {
    return 'The requested notification could not be found.';
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Notification service is unreachable. Check backend connectivity.';
  }

  return error?.message || fallbackMessage;
};
