import { Types, Schema, model } from "mongoose";

export type ExchangeRateType = "SPOT" | "CONTRACT" | "MANUAL";

export interface IExchangeRate {
  _id: Types.ObjectId;

  // Currency pair
  baseCurrency: string; // USD
  targetCurrency: string; // INR

  // Single source of truth (high precision)
  rate: string; // "83.250000"

  // Validity window
  validFrom: Date;
  validTo?: Date;

  // Rate classification
  rateType: ExchangeRateType;

  // Source tracking
  source?: string; // ECB | API | MANUAL

  // Status
  isActive: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    baseCurrency: {
      type: String,
      required: true,
    },
    targetCurrency: {
      type: String,
      required: true,
    },
    rate: {
      type: String,
      required: true,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
    },
    rateType: {
      type: String,
      enum: ["SPOT", "CONTRACT", "MANUAL"],
      required: true,
    },
    source: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const ExchangeRate = model<IExchangeRate>(
  "ExchangeRate",
  ExchangeRateSchema,
);
