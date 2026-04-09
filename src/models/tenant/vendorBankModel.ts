import { Schema, Types, model } from "mongoose";

export interface IVendorBank {
  vendorId?: Types.ObjectId;
  userId?: Types.ObjectId;

  userType: "VENDOR" | "TENANT" | "PLATFORM";

  accountNumber: string;
  maskedAccountNumber: string;
  accountHolderName: string;

  bankName: string;
  branch?: string;

  ifsc?: string;
  swift?: string;
  country?: string;

  isPrimary: boolean;

  status: "PENDING" | "VERIFIED" | "FAILED";

  verifiedAt?: Date;
}

export const VendorBankSchema = new Schema<IVendorBank>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },

    userType: {
      type: String,
      enum: ["VENDOR", "TENANT", "PLATFORM"],
      required: true,
      default: "VENDOR",
    },

    accountNumber: { type: String, required: true },
    maskedAccountNumber: { type: String, required: true },
    accountHolderName: { type: String, required: true },

    bankName: { type: String, required: true },
    branch: String,

    ifsc: String,
    swift: String,
    // e.g., "IN", "US", "GB"
    country: String, 

    isPrimary: { type: Boolean, default: true },

    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
      index: true,
    },

    verifiedAt: Date,
  },
  { timestamps: true, versionKey:false }
);