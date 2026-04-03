import { Schema, model, Types } from "mongoose";

export interface IVerification {
  vendorId: Types.ObjectId;

  tax: {
    taxId: string;
    status: "PENDING" | "VERIFIED" | "FAILED";
    nameMatch?: boolean;
  };

  bank: {
    status: "PENDING" | "VERIFIED" | "FAILED";
    nameMatch?: boolean;
  };

  documents: {
    total: number;
    verified: number;
    status: "PENDING" | "PARTIAL" | "VERIFIED";
  };

  duplicateCheck: {
    isDuplicate: boolean;
    reason?: string;
  };

  risk: {
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH";
    flags?: string[];
  };

  overallStatus:
    | "PENDING"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED";

  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
}

export const VerificationSchema = new Schema<IVerification>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      unique: true,
    },

    tax: {
      taxId: String,
      status: { type: String, default: "PENDING" },
      nameMatch: Boolean,
    },

    bank: {
      status: { type: String, default: "PENDING" },
      nameMatch: Boolean,
    },

    documents: {
      total: Number,
      verified: Number,
      status: { type: String, default: "PENDING" },
    },

    duplicateCheck: {
      isDuplicate: { type: Boolean, default: false },
      reason: String,
    },

    risk: {
      score: { type: Number, default: 0 },
      level: { type: String, default: "LOW" },
      flags: [String],
    },

    overallStatus: {
      type: String,
      default: "PENDING",
      index: true,
    },

    verifiedBy: { type: Schema.Types.ObjectId },
    verifiedAt: Date,
  },
  { timestamps: true }
);
