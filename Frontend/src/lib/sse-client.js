export const createSseClient = (url, options = {}) => {
  const source = new EventSource(url, options);
  return {
    source,
    close: () => source.close(),
  };
};

