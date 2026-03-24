import { Schema, Types, model } from "mongoose";
import { ITenant } from "../types/tenantTypes";

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true, index: true },
    legalName: { type: String, required: true, trim: true },

    about: { type: String, trim: true },
    logo: { type: String },

    domain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    companyCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    orgEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      countryCode: { type: String, required: true, default: "+91" },
      number: { type: String, required: true },
    },

    website: String,
    taxId: String,
    registrationNumber: String,
    industry: String,

    address: {
      street: { type: String, required: true },
      landmark: String,
      city: { type: String, required: true },
      state: String,
      country: { type: String, required: true },
      postalCode: String,
      latitude: Number,
      longitude: Number,
    },

    dbName: {
      type: String,
      required: true,
      unique: true,
    },
    
    security: {
      enforceMFA: {
        type: Boolean,
        default: false,
      },

      passwordExpiryDays: {
        type: Number,
        default: 90,
      },

      allowedIpRanges: [String],

      loginPolicy: {
        maxLoginAttempts: {
          type: Number,
          default: 5,
        },
        lockoutDurationMinutes: {
          type: Number,
          default: 30,
        },
      },
    },

    status: {
      type: String,
      enum: ["provisioning", "active", "failed"],
      default: "provisioning",
      index: true,
    },

    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },

    activatedAt: Date,
    suspendedAt: Date,

    metrics: {
      userCount: {
        type: Number,
        default: 0,
      },

      vendorCount: {
        type: Number,
        default: 0,
      },

      storageUsedMB: {
        type: Number,
        default: 0,
      },

      lastActivityAt: Date,
    },

    createdBy: {
      type: Types.ObjectId,
      ref: "PlatformUser",
    },

    updatedBy: {
      type: Types.ObjectId,
      ref: "PlatformUser",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default model<ITenant>("Tenant", tenantSchema);