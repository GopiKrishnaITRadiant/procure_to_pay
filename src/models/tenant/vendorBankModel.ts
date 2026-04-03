import { Schema, model, Types } from "mongoose";

export interface IVendorBank {
  vendorId: Types.ObjectId;

  accountNumber: string;
  accountHolderName: string;

  bankName: string;
  branch?: string;

  ifsc?: string;
  swift?: string;

  isPrimary: boolean;

  status: "PENDING" | "VERIFIED" | "FAILED";

  verifiedAt?: Date;
}

export const VendorBankSchema = new Schema<IVendorBank>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },

    accountNumber: { type: String, required: true },
    accountHolderName: { type: String, required: true },

    bankName: { type: String, required: true },
    branch: String,

    ifsc: String,
    swift: String,

    isPrimary: { type: Boolean, default: true },

    status: {
      type: String,
      default: "PENDING",
      index: true,
    },

    verifiedAt: Date,
  },
  { timestamps: true, versionKey:false }
);