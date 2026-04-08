import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';

const organisationSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      required: true,
      unique: true,
      default: () => randomUUID(),
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

export const Organisation = mongoose.model('Organisation', organisationSchema);
