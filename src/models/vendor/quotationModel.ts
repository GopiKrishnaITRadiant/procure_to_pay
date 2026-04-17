import { Schema, Types } from "mongoose";

export interface IQuotation {
  _id: Types.ObjectId;

  rfqId: Types.ObjectId;
  vendorId: Types.ObjectId;

  quotationNumber?: string;

  isPartial?: boolean;

  status:
  | "DRAFT"
  | "SUBMITTED"
  | "REVISED"
  | "CANCELLED"
  | "REJECTED"
  | "AWARDED"

  currency: string;

  totalAmount: number;
  tax?: number;
  shippingCost?: number;

  paymentTerms?: string;
  creditPeriod?: string;

  deliveryDate?: Date; // overall

  items: [{
    rfqItemId: Types.ObjectId;

    quantity: number;
    unitPrice: number;
    totalPrice: number;

    deliveryDate?: Date;
    remarks?: string;
  }];

  attachments?: string[];

  submittedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const QuotationSchema = new Schema<IQuotation>(
  {
    rfqId: { type: Types.ObjectId, ref: "RFQ", index: true },

    vendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
      index: true,
    },

    quotationNumber: String,

    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "REVISED", "CANCELLED", "REJECTED", "AWARDED"],
      default: "DRAFT",
    },

    isPartial: { type: Boolean, default: false },

    currency: { type: String, default: "INR" },

    totalAmount: { type: Number, required: true },
    tax: Number,
    shippingCost: Number,

    paymentTerms: String,
    creditPeriod: String,

    deliveryDate: Date,

    items: [
      {
        rfqItemId: { type: Types.ObjectId, required: true },

        quantity: Number,
        unitPrice: Number,
        totalPrice: Number,

        deliveryDate: Date,
        remarks: String,
      },
    ],

    attachments: [String],

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, versionKey: false }
);

// One active quotation per vendor per RFQ
QuotationSchema.index(
  { rfqId: 1, vendorId: 1 },
  { unique: true }
);