import { Schema, Types } from "mongoose";

export interface IRFQ {
  _id: Types.ObjectId;

  rfqNumber: string;

  requisitionId: Types.ObjectId;

  status:
    | "DRAFT"
    | "SENT"
    | "PO_CREATED"
    | "QUOTATION_RECEIVED"
    | "EVALUATION"
    | "PARTIALLY_AWARDED"
    | "AWARDED"
    | "CANCELLED";

  submissionDeadline: Date;

  currency: string;

  companyCode?: string;
  purchaseOrganization?: string;

  description?: string;
  paymentTerms?: string;
  vendors: Types.ObjectId[]; // invited vendors
  awardedItems: [
    {
      rfqItemId: Types.ObjectId,
      vendorId: Types.ObjectId,
      quotationId: Types.ObjectId,
    }
  ];

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelledReason?: string;

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
        "PO_CREATED",
        "QUOTATION_RECEIVED",
        "EVALUATION",
        "PARTIALLY_AWARDED",
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

    awardedItems: [
      {
        rfqItemId: {
          type: Types.ObjectId,
          ref: "RFQItem",
        },
        vendorId: {
          type: Types.ObjectId,
          ref: "Vendor",
        },
        quotationId: {
          type: Types.ObjectId,
          ref: "Quotation",
        },
      },
    ],
  },
  { timestamps: true, versionKey: false },
);
