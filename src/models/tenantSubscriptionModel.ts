import { Types, Schema, model } from "mongoose";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "grace"
  | "suspended"
  | "cancelled";

export interface IReminderMeta {
  trial7DaySent: boolean;
  trial2DaySent: boolean;
  trialEndSent: boolean;
  graceEndSent: boolean;
}

export interface ITenantSubscription {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  planId: Types.ObjectId;
  planCode: string;

  startDate: Date;
  trialEndDate?: Date;
  currentPeriodEnd?: Date;
  graceUntil?: Date;

  status: SubscriptionStatus;
  autoRenew: boolean;

  suspendedAt?: Date;
  cancelledAt?: Date;

  reminderMeta: IReminderMeta;

  createdAt: Date;
  updatedAt: Date;
}

const reminderMetaSchema = new Schema<IReminderMeta>(
  {
    trial7DaySent: { type: Boolean, default: false },
    trial2DaySent: { type: Boolean, default: false },
    trialEndSent: { type: Boolean, default: false },
    graceEndSent: { type: Boolean, default: false },
  },
  { _id: false }
);

const tenantSubscriptionSchema = new Schema<ITenantSubscription>(
  {
    tenantId: {
      type: Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    planId: {
      type: Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planCode: {
      type: String,
      required: true,
      index: true,
    },

    startDate: { type: Date, required: true },
    trialEndDate: Date,
    currentPeriodEnd: Date,
    graceUntil: Date,

    status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "past_due",
        "grace",
        "suspended",
        "cancelled",
      ],
      default: "trialing",
      index: true,
    },

    autoRenew: { type: Boolean, default: false },

    suspendedAt: Date,
    cancelledAt: Date,

    reminderMeta: {
      type: reminderMetaSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

tenantSubscriptionSchema.index({ status: 1, trialEndDate: 1 });
tenantSubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
tenantSubscriptionSchema.index({ status: 1, graceUntil: 1 });

export const tenantSubscriptionModel = model<ITenantSubscription>(
  "TenantSubscription",
  tenantSubscriptionSchema
);