import mongoose from 'mongoose';

const aiQueryRecordSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    answer_preview: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['success', 'error', 'stopped'],
      default: 'success',
      index: true,
    },
    ai_provider_requested: {
      type: String,
      enum: ['auto', 'openai', 'gemini'],
      default: 'auto',
    },
    ai_provider: {
      type: String,
      enum: ['openai', 'gemini', 'mock'],
      default: 'mock',
      index: true,
    },
    cached: {
      type: Boolean,
      default: false,
      index: true,
    },
    chunks_used: {
      type: Number,
      default: 0,
      min: 0,
    },
    citations_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    graph_context_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    latency_ms: {
      type: Number,
      default: null,
      min: 0,
    },
    error_message: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'ai_query_records',
    timestamps: true,
  }
);

aiQueryRecordSchema.index({ org_id: 1, createdAt: -1 });
aiQueryRecordSchema.index({ org_id: 1, user_id: 1, createdAt: -1 });

export const AiQueryRecord = mongoose.model(
  'AiQueryRecord',
  aiQueryRecordSchema
);
