import { Types, Schema } from "mongoose";

export interface IQuotationItem {
  _id: Types.ObjectId;
  rfqItemId: Types.ObjectId;
  quotationId: Types.ObjectId;

  // Vendor quoted values
  quotedUnitOfMeasure: string;
  quotedQuantity: number;
  quotedUnitPrice: number;
  quotedLineAmount: number;

  // Converted to RFQ requested UOM
  rfqUnitOfMeasure: string;
  convertedQuantity: number;
  convertedUnitPrice: number;
  convertedLineAmount: number;

  deliveryDate?: Date;
  remarks?: string;

  isAwarded: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const QuotationItemSchema = new Schema<IQuotationItem>(
  {
    quotationId: {
      type: Types.ObjectId,
      required: true,
    },
    rfqItemId: {
      type: Types.ObjectId,
      required: true,
      index: true,
    },

    quotedUnitOfMeasure: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    quotedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    quotedUnitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    quotedLineAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    rfqUnitOfMeasure: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    convertedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    convertedUnitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    convertedLineAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryDate: Date,

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    isAwarded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);