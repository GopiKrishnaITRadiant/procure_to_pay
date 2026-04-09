import { Schema, model, Types } from "mongoose";

export interface IDocument {
  vendorId: Types.ObjectId;
  userId: Types.ObjectId;
  tenantIntegrationId?: Types.ObjectId;

  documentCode: string;
  userType:"VENDOR"|"TENANT"|"PLATFORM";

  country: string;

  fileName: string;
  fileUrl: string;
  mimeType: string;

  status: "PENDING" | "VERIFIED" | "REJECTED"|"REPLACED";
  replacedBy?: Types.ObjectId;

  uploadedBy: Types.ObjectId;

  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;

  remarks?: string;
}

export const documentSchema = new Schema<IDocument>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    tenantIntegrationId: {
      type: Schema.Types.ObjectId,
      ref: "TenantIntegration",
      index: true,
    },

    userType: {
      type: String,
      enum: ["VENDOR", "TENANT", "PLATFORM"],
      required: true,
      default: "VENDOR",
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    documentCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    country: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },

    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "REPLACED"],
      default: "PENDING",
      index: true,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    verifiedBy: { type: Schema.Types.ObjectId },
    verifiedAt: Date,

    remarks: String,
  },
  { timestamps: true, versionKey: false }
);

documentSchema.index(
  { vendorId: 1, documentCode: 1 },
  { unique: true, partialFilterExpression: { vendorId: { $exists: true } } }
);

documentSchema.index(
  { userId: 1, documentCode: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);