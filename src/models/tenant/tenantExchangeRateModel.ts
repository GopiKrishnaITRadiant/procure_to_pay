import { Schema, model, Types } from "mongoose";

export interface ITenantExchangeRate {
    _id: Types.ObjectId;
    tenantId: Types.ObjectId;
    baseCurrency: string;
    targetCurrency: string;
    rate: string;
    validFrom: Date;
    validTo: Date;
    isActive: boolean;
    source: string;
    createdAt: Date;
    updatedAt: Date;
}

export const TenantExchangeRateSchema = new Schema<ITenantExchangeRate>(
  {
    tenantId: {
      type: Types.ObjectId,
      required: true,
      index: true,
    },

    baseCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    targetCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    rate: {
      type: String, // high precision
      required: true,
    },

    validFrom: {
      type: Date,
      default: Date.now,
    },

    validTo: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    source: {
      type: String,
      default: "TENANT",
    },
  },
  { timestamps: true, versionKey: false }
);

// Only one active rate per pair per tenant
TenantExchangeRateSchema.index(
  {
    tenantId: 1,
    baseCurrency: 1,
    targetCurrency: 1,
    isActive: 1,
  },
  { unique: true }
);

// Fast lookup
TenantExchangeRateSchema.index({
  tenantId: 1,
  baseCurrency: 1,
  targetCurrency: 1,
});