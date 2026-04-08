import mongoose from 'mongoose';

const encryptedPayloadSchema = new mongoose.Schema(
  {
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    ciphertext: { type: String, required: true },
    keyVersion: { type: String, required: true, default: 'v1' },
  },
  { _id: false }
);

const integrationCredentialSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['github', 'jira', 'slack', 'confluence'],
      index: true,
    },
    encryptedCredentials: {
      type: encryptedPayloadSchema,
      required: true,
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
      index: true,
    },
    lastPolledAt: {
      type: Date,
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

export const IntegrationCredential = mongoose.model(
  'IntegrationCredential',
  integrationCredentialSchema
);

