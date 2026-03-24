import { Schema, Types } from "mongoose";

export interface ITenantAmountLimit {
  tenantId: Types.ObjectId;
  roleId: Types.ObjectId;
  departments?: string[];

  minAmount: number;
  maxAmount: number;

  priority: number;
  level:number;
  isActive:boolean;
}

export const tenantAmountLimitSchema = new Schema<ITenantAmountLimit>(
  {
    tenantId: {
      type: Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    roleId: {
      type: Types.ObjectId,
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

    priority: {
      type: Number,
      default: 1,
    },
    level:{
      type:Number,
      default:1
    },
    isActive:{
      type:Boolean,
      default:true
    }
  },
  { timestamps: true,versionKey:false }
);
