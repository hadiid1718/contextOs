import mongoose from 'mongoose';

const roles = ['owner', 'admin', 'member', 'viewer'];

const membershipSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: roles,
      default: 'member',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'removed'],
      default: 'active',
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

membershipSchema.index({ org_id: 1, user: 1 }, { unique: true });
membershipSchema.index({ org_id: 1, role: 1 });

export const Membership = mongoose.model('Membership', membershipSchema);
