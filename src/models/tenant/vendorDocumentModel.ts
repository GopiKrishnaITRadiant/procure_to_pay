import { Schema, model, Types } from "mongoose";

export interface IVendorDocument {
  vendorId: Types.ObjectId;

  type:
    | "GST_CERT"
    | "PAN"
    | "MSME"
    | "BANK_PROOF"
    | "TRADE_LICENSE"
    | "INCORPORATION"
    | "OTHER";

  fileName: string;
  fileUrl: string;

  status: "PENDING" | "VERIFIED" | "REJECTED";

  uploadedBy: Types.ObjectId;

  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;

  remarks?: string;
}

export const VendorDocumentSchema = new Schema<IVendorDocument>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },

    type: { type: String, required: true, index: true },

    fileName: String,
    fileUrl: String,

    status: {
      type: String,
      default: "PENDING",
      index: true,
    },

    uploadedBy: { type: Schema.Types.ObjectId, required: true },

    verifiedBy: { type: Schema.Types.ObjectId },
    verifiedAt: Date,

    remarks: String,
  },
  { timestamps: true }
);