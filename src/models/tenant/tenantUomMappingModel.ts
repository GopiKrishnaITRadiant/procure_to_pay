import { Schema, Types } from "mongoose";

export interface ITenantUOMMapping {
    _id: Types.ObjectId;
    fromUOM: string;
    toUOM: string;
    factor: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export const TenantUOMMappingSchema = new Schema<ITenantUOMMapping>(
  {
    fromUOM: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    toUOM: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // high precision (string)
    factor: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Prevent duplicate mapping
TenantUOMMappingSchema.index(
  { tenantId: 1, fromUOM: 1, toUOM: 1 },
  { unique: true }
);

// Fast lookup
TenantUOMMappingSchema.index({ tenantId: 1, fromUOM: 1 });