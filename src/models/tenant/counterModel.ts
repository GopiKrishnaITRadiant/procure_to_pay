import { Schema, model } from "mongoose";

export interface ICounter{
    module:"PR"|"PO"|"INV";
    year:number;
    sequence:number;
}

export const counterSchema = new Schema<ICounter>(
  {
    module: {
      type: String,
      required: true,// PR, PO, INV
    },
    year: {
      type: Number,
      required: true,
    },
    sequence: {
      type: Number,
      default: 0,
    },
  },
  { versionKey: false }
);

counterSchema.index(
  { module: 1, year: 1 },
  { unique: true }
);
