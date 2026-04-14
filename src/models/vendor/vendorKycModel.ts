import { Schema, Types } from "mongoose";

export interface IVendorKYC {
  vendorId: Types.ObjectId;

  companyName: string;
  legalName?: string;

  taxId: string;
  taxIdType: string; // GST, VAT, EIN
  country: string;

  panNumber?: string;
  registrationNumber?: string;

  registeredAddress?: string;
  registeredCity?: string;
  registeredState?: string;
  registeredPin?: string;

  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  kycStatus:
    | "PENDING"
    | "UNDER_REVIEW"
    | "VERIFIED"
    | "APPROVED"
    | "REJECTED";

  submittedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
}

export const VendorKYCSchema = new Schema<IVendorKYC>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    companyName: { type: String, required: true },
    legalName: String,

    taxId: { type: String, required: true, index: true },
    taxIdType: { type: String, required: true },
    country: { type: String, required: true },

    registrationNumber: String,

    registeredAddress: String,
    registeredCity: String,
    registeredState: String,
    registeredPin: String,

    contactName: String,
    contactEmail: String,
    contactPhone: String,

    kycStatus: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "VERIFIED", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    submittedAt: Date,
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true,versionKey:false }
);

VendorKYCSchema.index(
  { vendorId: 1, country: 1 },
  { unique: true }
);
