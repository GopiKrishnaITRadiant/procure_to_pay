import { Schema, Types, model } from "mongoose";

export interface ITenantUOM {
  _id: Types.ObjectId;

  tenantId: Types.ObjectId;

  allowedUoms: string[]; // ["KG", "EA", "L"]

  customUoms: {
    code: string; // BAG, PACK
    name: string; // Bag, Pack
    category: "COUNT" | "WEIGHT" | "VOLUME" | "LENGTH" | "AREA";
    precision: number;
    isActive: boolean;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

export const TenantUOMSchema = new Schema<ITenantUOM>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    allowedUoms: {
      type: [String],
      required: true,
    },
    customUoms: {
      type: [
        {
          code: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
          category: {
            type: String,
            enum: ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA"],
            required: true,
          },
          precision: {
            type: Number,
            required: true,
          },
          isActive: {
            type: Boolean,
            required: true,
          },
        },
      ],
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
