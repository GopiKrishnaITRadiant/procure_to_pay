import { Schema, Types } from "mongoose";

export interface IRFQItem {
  _id: Types.ObjectId;

  rfqId: Types.ObjectId;

  requisitionItemId: Types.ObjectId;

  itemNumber: string;

  material?: string;
  materialId?: Types.ObjectId;

  description: string;

  quantity: number;
  unitOfMeasure: string;

  requiredDate: Date;

  plant?: string;

  status: "OPEN" | "AWARDED" | "CANCELLED";

  awardedVendorId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const RFQItemSchema = new Schema<IRFQItem>(
  {
    rfqId: { type: Types.ObjectId, ref: "RFQ", index: true },

    requisitionItemId: { type: Types.ObjectId, required: true, index: true },

    itemNumber: { type: String, required: true },

    material: String,
    materialId: { type: Types.ObjectId, ref: "Material" },

    description: { type: String, required: true },

    quantity: { type: Number, required: true },
    unitOfMeasure: { type: String, required: true },

    requiredDate: { type: Date, required: true },

    plant: String,

    status: {
      type: String,
      enum: ["OPEN", "AWARDED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    awardedVendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
    },
  },
  { timestamps: true, versionKey: false }
);

RFQItemSchema.index({ rfqId: 1, requisitionItemId: 1 });