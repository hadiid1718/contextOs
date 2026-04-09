import mongoose from 'mongoose';

const providers = ['github', 'jira', 'slack', 'confluence'];

const integrationCredentialSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: providers,
      required: true,
      index: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    externalId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'revoked'],
      default: 'active',
      index: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    encryptedPayload: {
      type: {
        algorithm: { type: String, required: true },
        iv: { type: String, required: true },
        authTag: { type: String, required: true },
        ciphertext: { type: String, required: true },
      },
      required: true,
    },
    encryptionAlgorithm: {
      type: String,
      default: 'aes-256-gcm',
    },
    encryptionIv: {
      type: String,
      required: true,
    },
    encryptionAuthTag: {
      type: String,
      required: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastPolledAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

integrationCredentialSchema.index({ org_id: 1, provider: 1 }, { unique: true });
integrationCredentialSchema.index({ org_id: 1, provider: 1, status: 1 });

export const IntegrationCredential = mongoose.model(
  'IntegrationCredential',
  integrationCredentialSchema
);

