import { Types } from "mongoose";

export interface IPlan {
  _id: Types.ObjectId;

  planCode: string; // e.g., FREE, STANDARD, ENTERPRISE
  displayName: string;
  description?: string;

  pricing: {
    currency: string;
    amount: number;
    taxIncluded?: boolean;
    billingCycle: "monthly" | "yearly";
  }[];

  features: {
    poModule: boolean;
    sapIntegration: boolean;
    vendorPortal: boolean;
    apiAccess: boolean;
    advancedAnalytics: boolean;
  };

  limits: {
    maxUsers: number;
    maxVendors: number;
    maxStorageMB: number;
  };

  trialDays?: number;

  provider?: {
    stripePriceId?: string;
    razorpayPlanId?: string;
  };

  isActive: boolean;
  isPublic: boolean; // visible on pricing page

  createdAt: Date;
  updatedAt: Date;
}