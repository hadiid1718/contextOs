export const requestContext = (req, _res, next) => {
  req.context = {
    org_id: req.header('x-org-id') || req.query.org_id || req.body?.org_id || 'unknown-org',
    receivedAt: new Date().toISOString(),
  };

  next();
};

