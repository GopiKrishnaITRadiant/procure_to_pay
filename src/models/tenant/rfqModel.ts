import { Schema, Types } from "mongoose";

export interface IRFQ {
  _id: Types.ObjectId;

  rfqNumber: string;

  requisitionId: Types.ObjectId;

  status:
    | "DRAFT"
    | "SENT"
    | "QUOTATION_RECEIVED"
    | "EVALUATION"
    | "AWARDED"
    | "CANCELLED";

  submissionDeadline: Date;

  currency: string;

  companyCode?: string;
  purchaseOrganization?: string;

  description?: string;
  paymentTerms?: string;
  vendors: Types.ObjectId[]; // invited vendors

  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const RFQSchema = new Schema<IRFQ>(
  {
    rfqNumber: { type: String, required: true, unique: true, index: true },

    requisitionId: {
      type: Types.ObjectId,
      ref: "Requisition",
      required: true,
      index: true,
    },

    submissionDeadline: { type: Date, required: true },

    currency: { type: String, default: "INR" },

    companyCode: String,
    purchaseOrganization: String,

    description: String,
    paymentTerms: String,

    status: {
      type: String,
      enum: [
        "DRAFT",
        "SENT",
        "QUOTATION_RECEIVED",
        "EVALUATION",
        "AWARDED",
        "CANCELLED",
      ],
      default: "DRAFT",
      index: true,
    },

    vendors: [
      {
        type: Types.ObjectId,
        ref: "Vendor",
        required: true,
        index: true,
      },
    ],

    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);
