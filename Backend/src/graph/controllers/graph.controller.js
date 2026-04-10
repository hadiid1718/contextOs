import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getCausalChain,
  getDecisionsForFile,
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

