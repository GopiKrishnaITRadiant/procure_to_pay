import { Schema, Types } from "mongoose";

export interface IVendorUser {
  _id: Types.ObjectId;
  vendorId: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  roleId: Types.ObjectId;
  authProvider: "LOCAL" | "AZURE";
  providerId?: string;

  isEmailVerified: boolean;
  emailVerificationToken: string;
  emailVerificationExpires: Date;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const VendorUserSchema = new Schema<IVendorUser>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    name: String,

    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      select: false,
    },

    roleId:{
      type: Schema.Types.ObjectId,
      ref: "VendorRole",
    },

    authProvider: {
      type: String,
      enum: ["LOCAL", "AZURE"],
      required: true,
    },

    providerId: String,

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: String,
    emailVerificationExpires: Date,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);