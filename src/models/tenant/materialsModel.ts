import { Schema, Types } from "mongoose";

export interface IMaterial {
  _id: Types.ObjectId;

  materialName:string;
  materialCode: string;
  description: string;

  categoryId?: Types.ObjectId;

  unitOfMeasure: string;

  price?: number;
  currency?: string;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const MaterialSchema = new Schema<IMaterial>(
  {
    materialCode: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    materialName:{
      type:String,
      trim:true,
    },
    description: {
      type: String,
      required: true,
      index: true,
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "MaterialCategory",
      index: true,
    },

    unitOfMeasure: {
      type: String,
      required: true,
    },

    price: Number,
    currency: String,

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true, versionKey:false }
);

MaterialSchema.index(
  { tenantId: 1, materialCode: 1 },
  { unique: true }
);

