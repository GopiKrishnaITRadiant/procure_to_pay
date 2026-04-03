import { Schema, Types } from "mongoose";

export interface ITenantAmountLimit {
  tenantId: Types.ObjectId;
  roleId: Types.ObjectId;
  departments?: string[];

  minAmount: number;
  maxAmount: number;

  level:number;
  approvalsRequired:number;
  isActive:boolean;
}

export const tenantAmountLimitSchema = new Schema<ITenantAmountLimit>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

     departments: {
      type: [String],
      default: [],
      index: true,
    },

    minAmount: {
      type: Number,
      default: 0,
    },

    maxAmount: {
      type: Number,
      required: true,
    },

    level: {
      type: Number,
      required: true,
    },

    approvalsRequired: {
      type: Number,
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
