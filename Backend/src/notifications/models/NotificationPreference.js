import mongoose from 'mongoose';

export const defaultNotificationTypePreferences = Object.freeze({
  info: true,
  success: true,
  warning: true,
  error: true,
});

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    typePreferences: {
      info: {
        type: Boolean,
        default: defaultNotificationTypePreferences.info,
      },
      success: {
        type: Boolean,
        default: defaultNotificationTypePreferences.success,
      },
      warning: {
        type: Boolean,
        default: defaultNotificationTypePreferences.warning,
      },
      error: {
        type: Boolean,
        default: defaultNotificationTypePreferences.error,
      },
    },
    emailDigestFrequency: {
      type: String,
      enum: ['instant', 'hourly', 'daily'],
      default: 'instant',
    },
  },
  { timestamps: true }
);

export const NotificationPreference = mongoose.model(
  'NotificationPreference',
  notificationPreferenceSchema
);
