import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getCausalChain,
  getDecisionsForFile,
  getGraphOverview as getGraphOverviewQuery,
  getGraphNodeById,
} from '../services/graphQuery.service.js';

export const getGraphNode = asyncHandler(async (req, res) => {
  const node = await getGraphNodeById(req.params.id);

  res.status(200).json({
    data: node,
  });
});

export const getGraphCausalChain = asyncHandler(async (req, res) => {
  const chain = await getCausalChain({
    nodeId: req.params.node_id,
    maxHops: req.query.max_hops,
  });

  res.status(200).json({
    data: chain,
  });
});

export const getGraphDecisions = asyncHandler(async (req, res) => {
  const decisions = await getDecisionsForFile({
    orgId: req.query.org_id,
    file: req.query.file,
  });

  res.status(200).json({
    data: decisions,
  });
});

export const getGraphOverview = asyncHandler(async (req, res) => {
  const nodeTypes = String(req.query.node_types || '')
    .split(',')
    .map(type => type.trim())
    .filter(Boolean);

  const overview = await getGraphOverviewQuery({
    orgId: req.query.org_id,
    nodeTypes,
    q: req.query.q,
    from: req.query.from,
    to: req.query.to,
    minConfidence: req.query.min_confidence,
    limit: req.query.limit,
  });

  res.status(200).json({
    data: overview,
  });
});
