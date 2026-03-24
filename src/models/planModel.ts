import { model, Types, Schema } from "mongoose";
import { IPlan } from "../types/subscriptionTypes";

const planSchema = new Schema<IPlan>(
  {
    planCode: {
      type: String,
      required: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    pricing: [
      {
        currency: { type: String, required: true },
        amount: { type: Number, required: true },
        taxIncluded: { type: Boolean, default: false },
        billingCycle: { type: String, enum: ["monthly", "yearly"], required: true },
      },
    ],

    features: {
      poModule: { type: Boolean, default: true },
      sapIntegration: { type: Boolean, default: false },
      vendorPortal: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
    },

    limits: {
      maxUsers: { type: Number, required: true, default:10 },
      maxVendors: { type: Number, required: true, default:50 },
      maxStorageMB: { type: Number, required: true,default:500 },
    },

    trialDays: {
      type: Number,
      default: 14,
    },

    provider: {
      stripePriceId: String,
      razorpayPlanId: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

planSchema.index({ isActive: 1 });

const planModel = model<IPlan>("Plan", planSchema);
export default planModel;