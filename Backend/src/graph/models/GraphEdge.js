import mongoose from 'mongoose';

const graphEdgeSchema = new mongoose.Schema(
  {
    from_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    to_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    org_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    relationship_type: {
      type: String,
      required: true,
      enum: ['caused', 'referenced', 'resolved', 'decided'],
    },
    confidence_score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  {
    collection: 'graph_edges',
    timestamps: true,
    versionKey: false,
  }
);

graphEdgeSchema.index({ from_id: 1, to_id: 1 });
graphEdgeSchema.index(
  { from_id: 1, to_id: 1, relationship_type: 1 },
  { unique: true }
);

export const GraphEdge = mongoose.model('GraphEdge', graphEdgeSchema);
