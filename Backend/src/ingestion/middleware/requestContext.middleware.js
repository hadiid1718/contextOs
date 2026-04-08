export const requestContext = (req, _res, next) => {
  const orgId =
    req.params?.orgId ||
    req.headers['x-org-id'] ||
    req.query?.org_id ||
    req.body?.org_id;

  if (orgId) {
    req.orgId = String(orgId);
    req.org_id = String(orgId);
  }

  req.requestContext = {
    org_id: req.org_id || null,
    requestId: req.headers['x-request-id'] || null,
  };

  next();
};

