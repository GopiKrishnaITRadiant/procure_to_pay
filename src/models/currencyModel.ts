import { Schema, Types, model } from "mongoose";

export interface ICurrency {
  _id: Types.ObjectId;
  country: string;
  code: string;
  symbol: string;
  // Number of decimal digits to display for the currency
  decimalDigits: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const currencySchema = new Schema<ICurrency>(
  {
    country: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      unique: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    decimalDigits: {
      type: Number,
      min: 0,
      max: 10,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const currencyModel = model<ICurrency>("Currency", currencySchema);
