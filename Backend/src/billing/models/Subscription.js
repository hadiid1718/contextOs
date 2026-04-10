import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, unique: true, index: true },
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null },
    stripePriceId: { type: String, default: null },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'active',
        'trialing',
        'past_due',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'unpaid',
        'paused',
      ],
      default: 'active',
      index: true,
    },
    seatCount: { type: Number, default: 1, min: 1 },
    maxUsers: { type: Number, default: 5, min: 0 },
    aiQueryLimit: { type: Number, default: 100, min: 0 },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

subscriptionSchema.index(
  { stripeSubscriptionId: 1 },
  { unique: true, sparse: true }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
