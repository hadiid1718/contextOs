import mongoose from 'mongoose';

const ragChunkSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    node_id: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    chunk_text: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: 'unknown',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    embedding: {
      type: [Number],
      default: [],
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'rag_chunks',
    versionKey: false,
  }
);

ragChunkSchema.index({ org_id: 1, node_id: 1, created_at: -1 });

export const RagChunk = mongoose.model('RagChunk', ragChunkSchema);

