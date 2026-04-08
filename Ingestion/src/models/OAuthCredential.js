import mongoose from 'mongoose';

const oauthCredentialSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, index: true, trim: true },
    source: {
      type: String,
      required: true,
      enum: ['github', 'jira', 'slack', 'confluence'],
      index: true,
    },
    encrypted: {
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
      ciphertext: { type: String, required: true },
    },
  },
  { timestamps: true }
);

oauthCredentialSchema.index({ org_id: 1, source: 1 }, { unique: true });

export const OAuthCredential = mongoose.model('OAuthCredential', oauthCredentialSchema);

