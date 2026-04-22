import { Schema, model, Types } from "mongoose";

export interface IRequisitionItem {
  _id: Types.ObjectId;

  itemNumber: string;

  material?: string;
  materialId?: Types.ObjectId;
  description: string;

  quantity: number;
  unitOfMeasure: string;
  pricePerUnit?: number;

  estimatedPrice?: number;

  requiredDate: Date;

  plant?: string;
  storageLocation?: string;

  status: "OPEN" | "PARTIALLY_ORDERED" | "ORDERED" | "CANCELLED";

  orderedQuantity?: number;
  isMaterialCatalog: boolean;
}

const RequisitionItemSchema = new Schema<IRequisitionItem>(
  {
    itemNumber: { type: String, required: true },

    material: { type: String, index: true },
    materialId: { type: Schema.Types.ObjectId, ref: "Material", index: true },
    description: { type: String, required: true },

    quantity: { type: Number, required: true },
    unitOfMeasure: { type: String, required: true },

    estimatedPrice: { type: Number },

    pricePerUnit: { type: Number, trim: true },

    requiredDate: { type: Date, required: true },

    plant: { type: String, index: true },
    storageLocation: { type: String },

    status: {
      type: String,
      enum: ["OPEN", "PARTIALLY_ORDERED", "ORDERED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    orderedQuantity: { type: Number, default: 0 },
    isMaterialCatalog: { type: Boolean, }
  },
  { _id: true, versionKey: false }
);

export interface IApprovalStep {
  level: number;

  roleIds: Types.ObjectId[];

  approvalsRequired: number;

  approvedBy: Types.ObjectId[];

  status: "PENDING"|"IN_PROGRESS" | "APPROVED" | "REJECTED";

  approvedAt?: Date;

  rejectedBy: Schema.Types.ObjectId,
  rejectedAt: Date,
  rejectionReason: String,
}

const ApprovalStepSchema = new Schema<IApprovalStep>(
  {
    level: { type: Number, required: true },

    roleIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Role",
        index: true,
      },
    ],

    approvalsRequired: {
      type: Number,
      default: 1,
    },

    approvedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    approvedAt: { type: Date },

    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    rejectedAt: { type: Date },

    rejectionReason: { type: String },
  },
  { _id: false, versionKey: false }
);

export interface IRequisition {
  _id: Types.ObjectId;

  requisitionNumber: string;

  requester: Types.ObjectId;
  department?: string;

  status:
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_CONVERTED"
  | "CONVERTED"
  | "CANCELLED";

  approvalStatus: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED";

  currentApprovalLevel: number;
  procurementType: "DIRECT" | "RFQ" | "CONTRACT";

  approvalFlow: IApprovalStep[];

  //last approved details
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  skipApproval: boolean

  requiredDate?: Date;

  totalEstimatedAmount?: number;
  currency?: string;

  items: IRequisitionItem[];

  source: "MANUAL" | "API";
  externalId?: string;

  idempotencyKey: String

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const RequisitionSchema = new Schema<IRequisition>(
  {
    requisitionNumber: {
      type: String,
      required: true,
    },

    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    department: { type: String, index: true },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "PARTIALLY_CONVERTED",
        "CONVERTED",
        "CANCELLED",
      ],
      default: "DRAFT",
      index: true,
    },

    approvalStatus: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    currentApprovalLevel: {
      type: Number,
      default: 0,
    },

    procurementType: {
      type: String,
      enum: ["DIRECT", "RFQ", "CONTRACT"],
      default: "RFQ",
    },

    approvalFlow: {
      type: [ApprovalStepSchema],
      default: [],
    },

    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    skipApproval: { type: Boolean, default: false },

    requiredDate: { type: Date },
    totalEstimatedAmount: { type: Number, index: true },
    currency: { type: String },

    items: {
      type: [RequisitionItemSchema],
      default: [],
    },

    source: {
      type: String,
      enum: ["MANUAL", "API"],
      default: "MANUAL",
    },

    externalId: { type: String },

    idempotencyKey: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false }
);

RequisitionSchema.index(
  { requisitionNumber: 1 },
  { unique: true }
);

// RequisitionSchema.index({ status: 1 });
// RequisitionSchema.index({ approvalStatus: 1 });
// RequisitionSchema.index({ requester: 1});
// RequisitionSchema.index({ currentApprovalLevel: 1 });
// RequisitionSchema.index({ createdAt: -1 });