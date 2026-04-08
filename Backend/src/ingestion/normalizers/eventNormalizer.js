const toEventTimestamp = payload => {
  const candidate =
    payload?.timestamp ||
    payload?.ts ||
    payload?.updated_at ||
    payload?.created_at ||
    payload?.issue?.fields?.updated ||
    payload?.issue?.fields?.created ||
    payload?.event_ts;

  const date = candidate ? new Date(candidate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export const normalizeEvent = ({ orgId, source, eventType, payload, metadata = {} }) => ({
  org_id: orgId,
  source,
  event_type: eventType,
  content: payload,
  metadata,
  timestamp: toEventTimestamp(payload),
});

