import mongoose from 'mongoose';

const usageRecordSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, index: true },
    periodKey: { type: String, required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    usageCount: { type: Number, default: 0, min: 0 },
    lastIncrementAt: { type: Date, default: null },
  },
  { timestamps: true }
);

usageRecordSchema.index({ org_id: 1, periodKey: 1 }, { unique: true });

export const UsageRecord = mongoose.model('UsageRecord', usageRecordSchema);
