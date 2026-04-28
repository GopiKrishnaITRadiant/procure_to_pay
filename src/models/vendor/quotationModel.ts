import { Schema, Types } from "mongoose";
import { IQuotationItem } from "./quotationItemModel";

export type QuotationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISED"
  | "CANCELLED"
  | "REJECTED"
  | "AWARDED"
  | "PARTIALLY_AWARDED"
  | "CLOSED";

export interface IQuotation {
  _id: Types.ObjectId;

  rfqId: Types.ObjectId;
  vendorId: Types.ObjectId;

  quotationNumber?: string;

  isPartial: boolean;

  status: QuotationStatus;

  // Vendor submitted currency
  quotationCurrency: string;

  // Buyer / Tenant base currency snapshot
  baseCurrency: string;

  // FX rate snapshot used during comparison
  exchangeRate: number;

  // Vendor entered totals
  totalAmount: number;
  tax?: number;
  shippingCost?: number;
  grandTotalAmount: number;

  // Converted totals in tenant base currency
  baseTotalAmount: number;
  baseTaxAmount?: number;
  baseShippingAmount?: number;
  baseGrandTotalAmount: number;

  paymentTerms?: string;
  creditPeriod?: string;

  deliveryDate?: Date;

  items: Types.ObjectId[];

  attachments?: string[];

  submittedAt?: Date;

  isSelected: boolean;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;

  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const QuotationSchema = new Schema<IQuotation>(
  {
    rfqId: {
      type: Types.ObjectId,
      ref: "RFQ",
      required: true,
      index: true,
    },

    vendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    quotationNumber: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "REVISED",
        "CANCELLED",
        "REJECTED",
        "AWARDED",
        "PARTIALLY_AWARDED",
        "CLOSED",
      ],
      default: "DRAFT",
      index: true,
    },

    isPartial: {
      type: Boolean,
      default: false,
    },

    quotationCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    baseCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    exchangeRate: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    baseTotalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    baseTaxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    baseShippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    baseGrandTotalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentTerms: {
      type: String,
      trim: true,
    },

    creditPeriod: {
      type: String,
      trim: true,
    },

    deliveryDate: Date,

    items: [
      {
        type: Types.ObjectId,
        ref: "QuotationItem",
        required: true,
      },
    ],

    attachments: {
      type: [String],
      default: [],
    },

    submittedAt: Date,

    isSelected: {
      type: Boolean,
      default: false,
    },

    approvedAt: Date,
    approvedBy: {
      type: Types.ObjectId,
      ref: "User",
    },

    rejectedAt: Date,
    rejectedBy: {
      type: Types.ObjectId,
      ref: "User",
    },

    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One quotation per vendor per RFQ
QuotationSchema.index(
  { rfqId: 1, vendorId: 1 },
  { unique: true }
);

// Comparison queries
QuotationSchema.index({
  rfqId: 1,
  status: 1,
  baseGrandTotalAmount: 1,
});

QuotationSchema.index({
  vendorId: 1,
  createdAt: -1,
});