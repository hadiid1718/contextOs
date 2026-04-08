const ingestionStatus = {
  enabled: false,
  kafkaConnected: false,
  schedulerStarted: false,
  startupError: null,
  updatedAt: null,
};

const markUpdated = () => {
  ingestionStatus.updatedAt = new Date().toISOString();
};

export const setIngestionStatus = updates => {
  Object.assign(ingestionStatus, updates);
  markUpdated();
};

export const getIngestionStatus = () => ({ ...ingestionStatus });
