import { Schema, Types } from "mongoose";

export interface ICountryKYC {
  _id: Types.ObjectId;

  tenantId: Types.ObjectId;

  country: string;

  version: number;
  isActive: boolean;

  taxIdLabel: string;
  taxIdType: string;

  bankRequired: boolean;

  documents: {
    code: string;
    type: string;
    label: string;

    category: "IDENTITY" | "BUSINESS" | "TAX" | "ADDRESS" | "FINANCIAL"| "KYC" | "OTHER";

    required: boolean;

    multipleAllowed?: boolean;
    requiredCount?: number;
  }[];

  fields: {
    key: string;
    label: string;
    required: boolean;
    type?: "STRING" | "NUMBER" | "DATE";
  }[];
}

export const CountryKYCConfigSchema = new Schema<ICountryKYC>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    country: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    taxIdLabel: { type: String, required: true, trim: true },
    taxIdType: { type: String, required: true, trim: true },

    bankRequired: { type: Boolean, default: true },

    documents: [
      {
        code: {
          type: String,
          required: true,
          uppercase: true,
          trim: true,
        },
        type: {
          type: String,
          required: true,
          uppercase: true,
          trim: true,
        },
        label: {
          type: String,
          required: true,
          trim: true,
        },
        category: {
          type: String,
          enum: ["IDENTITY", "BUSINESS", "TAX", "ADDRESS", "FINANCIAL", "KYC", "OTHER"],
          required: true,
        },
        required: {
          type: Boolean,
          default: true,
        },

        multipleAllowed: {
          type: Boolean,
          default: false,
        },
        requiredCount: {
          type: Number,
          default: 1,
        },
      },
    ],

    fields: [
      {
        key: {
          type: String,
          required: true,
          trim: true,
        },
        label: {
          type: String,
          required: true,
          trim: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
        type: {
          type: String,
          enum: ["STRING", "NUMBER", "DATE"],
          default: "STRING",
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);