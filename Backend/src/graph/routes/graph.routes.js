import { Router } from 'express';

import {
  getGraphCausalChain,
  getGraphDecisions,
  getGraphNode,
} from '../controllers/graph.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  getGraphCausalChainSchema,
  getGraphDecisionsSchema,
  getGraphNodeSchema,
} from '../validators/graph.schemas.js';

const graphRouter = Router();

graphRouter.get('/node/:id', validate(getGraphNodeSchema), getGraphNode);
graphRouter.get(
  '/causal-chain/:node_id',
  validate(getGraphCausalChainSchema),
  getGraphCausalChain
);
graphRouter.get('/decisions', validate(getGraphDecisionsSchema), getGraphDecisions);

export { graphRouter };

