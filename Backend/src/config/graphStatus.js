const graphStatus = {
  enabled: false,
  kafkaConnected: false,
  consumerRunning: false,
  startupError: null,
  processedEvents: 0,
  updatedAt: null,
};

const markUpdated = () => {
  graphStatus.updatedAt = new Date().toISOString();
};

export const setGraphStatus = updates => {
  Object.assign(graphStatus, updates);
  markUpdated();
};

export const incrementGraphProcessedEvents = () => {
  graphStatus.processedEvents += 1;
  markUpdated();
};

export const getGraphStatus = () => ({ ...graphStatus });
