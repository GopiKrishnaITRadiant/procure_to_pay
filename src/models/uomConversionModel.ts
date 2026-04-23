import { Types, Schema, model } from "mongoose";

export interface IUOMConversion {
  _id: Types.ObjectId;

  fromUOM: string; // KG
  toUOM: string; // G
  description?: string;

  category: "COUNT" | "WEIGHT" | "VOLUME" | "LENGTH" | "AREA";

  factor: string; // multiply
  reverseFactor?: string; // optional

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
}

const UOMConversionSchema = new Schema<IUOMConversion>(
  {
    fromUOM: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    toUOM: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      enum: ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA"],
      required: true,
      index: true,
    },

    factor: {
      type: String,
      required: true,
    },
    reverseFactor: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true, versionKey: false },
);

UOMConversionSchema.index({ fromUOM: 1, toUOM: 1 }, { unique: true });

export const UOMConversionModel = model<IUOMConversion>(
  "UOMConversion",
  UOMConversionSchema,
);
