import { Types, Schema, model } from "mongoose";

export type UOMCategory = "COUNT" | "WEIGHT" | "VOLUME" | "LENGTH" | "AREA";

export interface IUOM {
  _id: Types.ObjectId;

  code: string; // KG, EA, BOX (UNIQUE, UPPERCASE)
  name: string; // Kilogram, Each
  symbol?: string; // kg, ea

  category: UOMCategory;

  isBaseUnit: boolean; // ONLY ONE per category

  precision: number; // decimal places (0 for EA, 2 for KG)

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
}

const UOMSchema = new Schema<IUOM>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      enum: ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA"],
      required: true,
      index: true,
    },

    isBaseUnit: {
      type: Boolean,
      default: false,
    },
    precision: {
      type: Number,
      default: 2,
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

UOMSchema.index({ code: 1 }, { unique: true });

UOMSchema.index(
  { category: 1, isBaseUnit: 1 },
  { unique: true, partialFilterExpression: { isBaseUnit: true } },
);

export const UOMModel = model<IUOM>("UOM", UOMSchema);
