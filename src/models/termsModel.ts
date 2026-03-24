import { Schema, model, Types, Document } from "mongoose";

export type TermsType = "PLATFORM" | "TENANT";

export interface ITerms {
  title: string;
  version: string; // v1, v2, v3 OR semantic (1.0.0)

  type: TermsType;

  content: string; // HTML / markdown / JSON

  isActive: boolean;
  effectiveFrom: Date;

  tenantId: Types.ObjectId | null;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const termsSchema = new Schema<ITerms>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    version: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["PLATFORM", "TENANT"],
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    effectiveFrom: {
      type: Date,
      required: true,
      index: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true, versionKey:false
  }
);

termsSchema.index(
  { type: 1, tenantId: 1, version: 1 },
  { unique: true }
);

termsSchema.index(
  { tenantId: 1, type: 1, isActive: 1 }
);

export const termsModel = model<ITerms>("Terms", termsSchema);