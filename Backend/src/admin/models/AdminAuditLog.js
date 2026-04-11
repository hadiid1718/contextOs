import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    ts: {
      type: Date,
      default: Date.now,
      index: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: false }
);

export const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);
