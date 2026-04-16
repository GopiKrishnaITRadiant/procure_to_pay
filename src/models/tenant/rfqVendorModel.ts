import { Types, Schema } from "mongoose";

export interface IRFQVendor {
  _id: Types.ObjectId;

  rfqId: Types.ObjectId;
  vendorId: Types.ObjectId;

  status:
    | "INVITED"
    | "VIEWED"
    | "RESPONDED"
    | "DECLINED";

  invitedAt: Date;
  viewedAt?: Date;
  respondedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const RFQVendorSchema = new Schema<IRFQVendor>(
  {
    rfqId: { type: Types.ObjectId, ref: "RFQ", index: true },

    vendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
      index: true,
    },

    status: {
      type: String,
      enum: ["INVITED", "VIEWED", "RESPONDED", "DECLINED"],
      default: "INVITED",
      index: true,
    },

    invitedAt: { type: Date, default: Date.now },
    viewedAt: Date,
    respondedAt: Date,
  },
  { timestamps: true, versionKey: false }
);

// Prevent duplicate vendor per RFQ
RFQVendorSchema.index({ rfqId: 1, vendorId: 1 }, { unique: true });