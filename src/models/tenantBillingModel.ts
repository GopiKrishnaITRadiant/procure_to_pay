import { Schema, Types, model } from "mongoose";
import { ITenantBilling } from "../types/tenantBillingTypes";

const tenantBillingSchema = new Schema<ITenantBilling>(
  {
    tenantId: {
      type: Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },

    billingEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    billingContactName: String,
    paymentCustomerId: String,

    billingContactPhone: {
      countryCode: {
        type: String,
        default: "+91",
      },
      number: String,
    },

    billingAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentTermsDays: {
      type: Number,
      default: 30,
    },

    taxId: String,

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },

    invoicePrefix: {
      type: String,
      default: "INV",
    },

    billingProvider: {
      type: String,
      enum: ["stripe", "razorpay", "manual"],
      default: "manual",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const tenantBillingModel = model("TenantBilling", tenantBillingSchema);
export default tenantBillingModel