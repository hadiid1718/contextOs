const buildEvent = ({ org_id, source, event_type, content, metadata, timestamp }) => ({
  org_id,
  source,
  event_type,
  content,
  metadata,
  timestamp: timestamp || new Date().toISOString(),
});

export const normalizeGithubWebhook = ({ org_id, eventName, payload }) => {
  if (!['push', 'pull_request', 'issues'].includes(eventName)) {
    return null;
  }

  const content =
    eventName === 'push'
      ? payload.head_commit?.message || 'GitHub push event'
      : payload.pull_request?.title || payload.issue?.title || 'GitHub event';

  return buildEvent({
    org_id,
    source: 'github',
    event_type: eventName,
    content,
    metadata: {
      deliveryId: payload.deliveryId,
      repository: payload.repository?.full_name,
      sender: payload.sender?.login,
      action: payload.action,
    },
  });
};

export const normalizeJiraWebhook = ({ org_id, payload }) => {
  const eventName = payload.webhookEvent;
  if (!['jira:issue_created', 'jira:issue_updated'].includes(eventName)) {
    return null;
  }

  return buildEvent({
    org_id,
    source: 'jira',
    event_type: eventName,
    content: payload.issue?.fields?.summary || 'Jira issue event',
    metadata: {
      issueKey: payload.issue?.key,
      projectKey: payload.issue?.fields?.project?.key,
      user: payload.user?.accountId,
    },
  });
};

export const normalizeSlackWebhook = ({ org_id, payload }) => {
  const event = payload.event;
  if (!event || event.type !== 'message') {
    return null;
  }

  return buildEvent({
    org_id,
    source: 'slack',
    event_type: 'message',
    content: event.text || '',
    metadata: {
      channel: event.channel,
      user: event.user,
      team: payload.team_id,
      eventId: payload.event_id,
    },
    timestamp: event.event_ts ? new Date(Number(event.event_ts) * 1000).toISOString() : undefined,
  });
};

export const normalizePolledItem = ({ org_id, source, item }) => {
  return buildEvent({
    org_id,
    source,
    event_type: item.event_type || 'poll_update',
    content: item.content || 'Scheduled poll event',
    metadata: item.metadata || {},
    timestamp: item.timestamp,
  });
};

