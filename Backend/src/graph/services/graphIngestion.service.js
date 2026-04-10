import { createHash } from 'node:crypto';

import { GraphEdge } from '../models/GraphEdge.js';
import { GraphNode } from '../models/GraphNode.js';

const relationshipTypes = new Set(['caused', 'referenced', 'resolved', 'decided']);

const scoreOrDefault = (value, fallback = 0.6) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, numeric));
};

const toDate = value => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const buildStableId = ({ orgId, nodeType, source, externalRef }) => {
  const digest = createHash('sha1')
    .update(`${orgId}:${nodeType}:${source}:${externalRef}`)
    .digest('hex');

  return `${nodeType}_${digest}`;
};

const collectTicketKeys = input => {
  const text = String(input || '');
  const matches = text.match(/\b[A-Z][A-Z0-9]+-\d+\b/g) || [];
  return [...new Set(matches)];
};

const isDecisionEvent = event => {
  const eventType = String(event.event_type || '').toLowerCase();
  const contentText = String(event.content?.text || event.content?.summary || '').toLowerCase();

  return (
    eventType.includes('decision') ||
    contentText.includes('decision:') ||
    contentText.includes('we decided')
  );
};

const createNode = ({ orgId, nodeType, source, externalRef, content, metadata, createdAt }) => ({
  _id: buildStableId({ orgId, nodeType, source, externalRef }),
  org_id: orgId,
  node_type: nodeType,
  source,
  content,
  metadata,
  created_at: toDate(createdAt),
});

const extractNodesFromEvent = event => {
  const orgId = event.org_id;
  const source = event.source || 'unknown';
  const nodes = [];

  if (!orgId) {
    return nodes;
  }

  if (source === 'github') {
    const commits = Array.isArray(event.content?.commits) ? event.content.commits : [];
    for (const commit of commits) {
      if (!commit?.id) {
        continue;
      }

      nodes.push(
        createNode({
          orgId,
          nodeType: 'commit',
          source,
          externalRef: commit.id,
          content: commit,
          metadata: {
            ...event.metadata,
            repository: event.content?.repository || null,
            event_type: event.event_type,
          },
          createdAt: event.timestamp,
        })
      );
    }

    if (event.content?.pull_request?.number) {
      const repository = event.content?.repository || event.metadata?.repository_full_name || 'repo';
      const prRef = `${repository}#${event.content.pull_request.number}`;

      nodes.push(
        createNode({
          orgId,
          nodeType: 'pr',
          source,
          externalRef: prRef,
          content: event.content.pull_request,
          metadata: {
            ...event.metadata,
            event_type: event.event_type,
          },
          createdAt: event.timestamp,
        })
      );
    }

    if (event.content?.issue?.number) {
      const repository = event.content?.repository || event.metadata?.repository_full_name || 'repo';
      const issueRef = `${repository}#${event.content.issue.number}`;

      nodes.push(
        createNode({
          orgId,
          nodeType: 'ticket',
          source,
          externalRef: issueRef,
          content: event.content.issue,
          metadata: {
            ...event.metadata,
            event_type: event.event_type,
          },
          createdAt: event.timestamp,
        })
      );
    }
  }

  if (source === 'jira' && event.content?.issue) {
    const jiraRef = event.content.issue.key || event.content.issue.id;
    if (jiraRef) {
      nodes.push(
        createNode({
          orgId,
          nodeType: 'ticket',
          source,
          externalRef: jiraRef,
          content: event.content.issue,
          metadata: {
            ...event.metadata,
            event_type: event.event_type,
          },
          createdAt: event.timestamp,
        })
      );
    }
  }

  if (source === 'slack') {
    const channel = event.content?.channel || event.metadata?.channel || 'unknown-channel';
    const ts = event.content?.ts || event.content?.thread_ts || event.timestamp || Date.now();
    nodes.push(
      createNode({
        orgId,
        nodeType: 'message',
        source,
        externalRef: `${channel}:${ts}`,
        content: event.content,
        metadata: {
          ...event.metadata,
          event_type: event.event_type,
        },
        createdAt: event.timestamp,
      })
    );
  }

  if (source === 'confluence') {
    const pageId = event.content?.id || event.content?.contentId || event.metadata?.id || event.timestamp;
    nodes.push(
      createNode({
        orgId,
        nodeType: 'document',
        source,
        externalRef: pageId,
        content: event.content,
        metadata: {
          ...event.metadata,
          event_type: event.event_type,
        },
        createdAt: event.timestamp,
      })
    );
  }

  if (isDecisionEvent(event)) {
    const decisionRef =
      event.metadata?.decision_id ||
      event.content?.decision_id ||
      `${event.source || 'unknown'}:${event.timestamp || Date.now()}`;

    nodes.push(
      createNode({
        orgId,
        nodeType: 'decision',
        source,
        externalRef: decisionRef,
        content: event.content,
        metadata: {
          ...event.metadata,
          event_type: event.event_type,
        },
        createdAt: event.timestamp,
      })
    );
  }

  if (nodes.length > 0) {
    return nodes;
  }

  const fallbackType =
    source === 'jira'
      ? 'ticket'
      : source === 'slack'
        ? 'message'
        : source === 'confluence'
          ? 'document'
          : 'commit';

  nodes.push(
    createNode({
      orgId,
      nodeType: fallbackType,
      source,
      externalRef: `${event.event_type || 'event'}:${event.timestamp || Date.now()}`,
      content: event.content,
      metadata: {
        ...event.metadata,
        event_type: event.event_type,
      },
      createdAt: event.timestamp,
    })
  );

  return nodes;
};

const buildMetadataEdges = event => {
  const metadataEdges = Array.isArray(event.metadata?.relationships)
    ? event.metadata.relationships
    : [];

  return metadataEdges
    .map(edge => ({
      from_id: String(edge.from_id || ''),
      to_id: String(edge.to_id || ''),
      relationship_type: String(edge.relationship_type || '').toLowerCase(),
      confidence_score: scoreOrDefault(edge.confidence_score, 0.75),
    }))
    .filter(
      edge =>
        Boolean(edge.from_id) &&
        Boolean(edge.to_id) &&
        relationshipTypes.has(edge.relationship_type)
    );
};

const buildDerivedEdges = ({ event, nodes }) => {
  const edges = [];
  const nodeByType = new Map();

  for (const node of nodes) {
    const list = nodeByType.get(node.node_type) || [];
    list.push(node);
    nodeByType.set(node.node_type, list);
  }

  const commits = nodeByType.get('commit') || [];
  const tickets = nodeByType.get('ticket') || [];
  const prs = nodeByType.get('pr') || [];
  const decisions = nodeByType.get('decision') || [];

  for (const commit of commits) {
    const commitMessage = String(commit.content?.message || '');
    const keys = collectTicketKeys(commitMessage);

    for (const key of keys) {
      const existingTicket = tickets.find(ticket => {
        const ticketKey = ticket.content?.key || ticket.content?.id || ticket.content?.number;
        return String(ticketKey || '').toUpperCase() === key;
      });

      if (!existingTicket) {
        const ticketNode = createNode({
          orgId: event.org_id,
          nodeType: 'ticket',
          source: 'derived',
          externalRef: key,
          content: { key, summary: `Referenced by commit ${commit._id}` },
          metadata: { derived_from: commit._id },
          createdAt: event.timestamp,
        });
        tickets.push(ticketNode);
        nodes.push(ticketNode);
      }
    }
  }

  for (const commit of commits) {
    for (const ticket of tickets) {
      edges.push({
        from_id: commit._id,
        to_id: ticket._id,
        relationship_type: 'referenced',
        confidence_score: 0.72,
      });
    }
  }

  const isResolvedEvent = String(event.event_type || '').toLowerCase().includes('merged');
  if (isResolvedEvent) {
    for (const pr of prs) {
      for (const ticket of tickets) {
        edges.push({
          from_id: pr._id,
          to_id: ticket._id,
          relationship_type: 'resolved',
          confidence_score: 0.86,
        });
      }
    }
  }

  if (decisions.length > 0) {
    const nonDecisionNodes = nodes.filter(node => node.node_type !== 'decision');
    for (const decision of decisions) {
      for (const originNode of nonDecisionNodes) {
        edges.push({
          from_id: originNode._id,
          to_id: decision._id,
          relationship_type: 'decided',
          confidence_score: 0.9,
        });
      }
    }
  }

  return edges;
};

const uniqueEdges = edgeCandidates => {
  const edgeMap = new Map();

  for (const edge of edgeCandidates) {
    if (!relationshipTypes.has(edge.relationship_type)) {
      continue;
    }

    const key = `${edge.from_id}:${edge.to_id}:${edge.relationship_type}`;
    const existing = edgeMap.get(key);
    if (!existing || existing.confidence_score < edge.confidence_score) {
      edgeMap.set(key, edge);
    }
  }

  return [...edgeMap.values()];
};

const upsertNode = async node => {
  await GraphNode.findByIdAndUpdate(
    node._id,
    {
      $set: {
        org_id: node.org_id,
        node_type: node.node_type,
        source: node.source,
        content: node.content,
        metadata: node.metadata,
      },
      $setOnInsert: {
        created_at: node.created_at,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const upsertEdge = async edge => {
  await GraphEdge.findOneAndUpdate(
    {
      from_id: edge.from_id,
      to_id: edge.to_id,
      relationship_type: edge.relationship_type,
    },
    {
      $set: {
        org_id: edge.org_id,
      },
      $max: {
        confidence_score: scoreOrDefault(edge.confidence_score),
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

export const processGraphEvent = async event => {
  const nodes = extractNodesFromEvent(event);
  if (nodes.length === 0) {
    return { upsertedNodes: 0, upsertedEdges: 0 };
  }

  const derivedEdges = buildDerivedEdges({ event, nodes });
  const uniqueNodes = [...new Map(nodes.map(node => [node._id, node])).values()];

  for (const node of uniqueNodes) {
    await upsertNode(node);
  }

  const metadataEdges = buildMetadataEdges(event);
  const allEdges = uniqueEdges([...metadataEdges, ...derivedEdges]).map(edge => ({
    ...edge,
    org_id: event.org_id,
  }));

  for (const edge of allEdges) {
    await upsertEdge(edge);
  }

  return {
    upsertedNodes: uniqueNodes.length,
    upsertedEdges: allEdges.length,
  };
};


