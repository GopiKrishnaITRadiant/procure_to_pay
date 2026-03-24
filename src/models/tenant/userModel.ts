import { Schema, model, Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  azureAdId?: string;
  displayName: string;
  email: string;
  password?: string;
  role: Types.ObjectId;
  department?: string;
  approvalLimit: number;
  authProvider?: "AZURE" | "LOCAL";
  isActive: boolean;
  isVerified?: boolean;
  tenantId: Types.ObjectId;
}

export const userSchema = new Schema<IUser>(
  {
    azureAdId: {
      type: String,
    },
    displayName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    role: {
      type: Types.ObjectId,
      ref: "Role",
      required: true,
    },
    department: {
      type: String,
    },
    approvalLimit: {
      type: Number,
      default: 0,
    },
    authProvider: {
      type: String,
      enum: ["AZURE", "LOCAL"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    tenantId: {
      type: Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
