/**
 * Database migrations for Knowledge Graph Service
 * Run this to create necessary indexes
 */

import { GraphNode } from '../graph/models/GraphNode.js';
import { GraphEdge } from '../graph/models/GraphEdge.js';
import logger from './loggers.js';

export const createGraphIndexes = async () => {
  try {
    logger.info('Creating Knowledge Graph indexes...');

    // GraphNode indexes
    await GraphNode.collection.createIndex({ org_id: 1, node_type: 1 });
    logger.info('Created index on GraphNode: (org_id, node_type)');

    // GraphEdge indexes
    await GraphEdge.collection.createIndex({ from_id: 1, to_id: 1 });
    logger.info('Created index on GraphEdge: (from_id, to_id)');

    await GraphEdge.collection.createIndex({ org_id: 1 });
    logger.info('Created index on GraphEdge: (org_id)');

    await GraphEdge.collection.createIndex(
      { from_id: 1, to_id: 1, relationship_type: 1 },
      { unique: true }
    );
    logger.info(
      'Created unique index on GraphEdge: (from_id, to_id, relationship_type)'
    );

    logger.info('All Knowledge Graph indexes created successfully');
  } catch (error) {
    logger.error(`Error creating indexes: ${error.message}`);
    throw error;
  }
};

export const dropGraphIndexes = async () => {
  try {
    logger.info('Dropping Knowledge Graph indexes...');

    await GraphNode.collection.dropIndex('org_id_1_node_type_1');
    await GraphEdge.collection.dropIndex('from_id_1_to_id_1');
    await GraphEdge.collection.dropIndex('org_id_1');
    await GraphEdge.collection.dropIndex(
      'from_id_1_to_id_1_relationship_type_1'
    );

    logger.info('All Knowledge Graph indexes dropped');
  } catch (error) {
    logger.warn(`Some indexes may not exist: ${error.message}`);
  }
};
