import { Schema, model, Types } from "mongoose";

export interface ITenantInvoice {
  tenantId: Types.ObjectId;
  subscriptionId: Types.ObjectId;

  amount: number;
  currency: string;

  status: "pending" | "paid" | "failed";

  invoiceNumber: string;

  periodStart: Date;
  periodEnd: Date;

  paidAt?: Date;

  createdAt: Date;
}

const invoiceSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: "Tenant", required: true },
    subscriptionId: {
      type: Types.ObjectId,
      ref: "TenantSubscription",
      required: true,
    },

    amount: { type: Number, required: true },

    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    invoiceNumber: String,

    periodStart: Date,
    periodEnd: Date,

    paidAt: Date,
  },
  { timestamps: true }
);

export const TenantInvoice = model("TenantInvoice", invoiceSchema);