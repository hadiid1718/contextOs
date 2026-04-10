import mongoose from 'mongoose';

const graphNodeSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    org_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    node_type: {
      type: String,
      required: true,
      enum: ['commit', 'pr', 'message', 'ticket', 'document', 'decision'],
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'graph_nodes',
    versionKey: false,
  }
);

graphNodeSchema.index({ org_id: 1, node_type: 1 });

export const GraphNode = mongoose.model('GraphNode', graphNodeSchema);
