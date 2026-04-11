import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    org_id: {
      type: String,
      required: true,
      trim: true,
      default: 'global',
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    route: {
      type: String,
      trim: true,
      default: '/notifications',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user_id: 1, org_id: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
