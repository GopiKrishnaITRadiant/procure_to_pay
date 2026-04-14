import { Types, Schema } from "mongoose";

export interface IVendorRole {
  vendorId: Types.ObjectId;
  name: string;
  permissions: string[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const VendorRoleSchema = new Schema<IVendorRole>(
  {
    vendorId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    permissions: { type: [String], required: true },
    isActive: { type: Boolean, required: true },
    createdBy: { type: Schema.Types.ObjectId },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  { versionKey: false, timestamps: true },
);
