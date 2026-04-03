import { Schema, Types } from "mongoose";

export interface IVendor {
  _id: Types.ObjectId;

  companyName: string;
  code: string;

  vendorType: "INTERNAL" | "EXTERNAL";

  onboardingSource: "ADMIN" | "SELF"

  sourceSystem?: "SAP" | "MANUAL";

  externalId?: string;

  status:
    | "DRAFT"
    | "IN_PROGRESS"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "ACTIVE"
    | "REJECTED"
    | "BLOCKED";

  vendorCategory: 
  | "SUPPLIER"
  | "SERVICE_PROVIDER"
  | "CONTRACTOR"
  | "CONSULTANT"
  | "DISTRIBUTOR"
  | "MANUFACTURER"
  | "OTHER";

  email?: string;

  phone?: string;
  phoneCountryCode?: string;

  country: string;

  capabilities: {
    portalAccess: boolean;
    canParticipateInRFQ: boolean;
    canReceivePO: boolean;
    canSubmitInvoice: boolean;
  };

  profileCompleted:boolean,

  syncStatus?: "SYNCED" | "UPDATED" | "ERROR";
  lastSyncedAt?: Date;

  isActive: boolean;

  approvedAt?: Date;
  approvedBy?: Types.ObjectId;

  rejectedReason?: string;
  blockedReason?: string;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const VendorSchema = new Schema<IVendor>(
  {
    companyName: { type: String, required: true, trim: true },

    code: { type: String, required: true, unique: true },

    vendorType: {
      type: String,
      enum: ["INTERNAL", "EXTERNAL"],
      required: true,
      index: true,
    },

    vendorCategory: {
      type: String,
      enum: [
        "SUPPLIER",
        "SERVICE_PROVIDER",
        "CONTRACTOR",
        "CONSULTANT",
        "DISTRIBUTOR"
      ]
    },

    onboardingSource: {
      type: String,
      enum: ["ADMIN", "SELF"],
      required: true,
      index: true,
    },

    sourceSystem: {
      type: String,
      enum: ["SAP", "ORACLE", "MANUAL"],
    },

    externalId: {
      type: String,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "IN_PROGRESS",
        "UNDER_REVIEW",
        "APPROVED",
        "ACTIVE",
        "REJECTED",
        "BLOCKED",
      ],
      default: "DRAFT",
      index: true,
    },

    email: { type: String, trim: true },

    phone: { type: String },
    phoneCountryCode: { type: String },

    country: { type: String, required: true },

    capabilities: {
      portalAccess: { type: Boolean, default: false },
      canParticipateInRFQ: { type: Boolean, default: false },
      canReceivePO: { type: Boolean, default: false },
      canSubmitInvoice: { type: Boolean, default: false },
    },

    profileCompleted:{
      type:Boolean,
      default:false
    },

    syncStatus: {
      type: String,
      enum: ["SYNCED", "UPDATED", "ERROR"],
    },

    lastSyncedAt: Date,

    isActive: {
      type: Boolean,
      default: true,
    },

    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId },

    rejectedReason: String,
    blockedReason: String,

    createdBy: {
      type: Schema.Types.ObjectId,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);