import mongoose from "mongoose";
import dotenv from "dotenv";
import { currencyModel } from "../../src/models/currencyModel";
dotenv.config();

const currencies = [
  // India
  { country: "India", code: "INR", symbol: "₹", decimalDigits: 2 },

  // Major global + India trade partners
  { country: "United States", code: "USD", symbol: "$", decimalDigits: 2 },
  { country: "United Arab Emirates", code: "AED", symbol: "د.إ", decimalDigits: 2 },
  { country: "Saudi Arabia", code: "SAR", symbol: "﷼", decimalDigits: 2 },
  { country: "Singapore", code: "SGD", symbol: "$", decimalDigits: 2 },
  { country: "United Kingdom", code: "GBP", symbol: "£", decimalDigits: 2 },
  { country: "Germany", code: "EUR", symbol: "€", decimalDigits: 2 },
  { country: "France", code: "EUR", symbol: "€", decimalDigits: 2 },
  { country: "Italy", code: "EUR", symbol: "€", decimalDigits: 2 },
  { country: "Netherlands", code: "EUR", symbol: "€", decimalDigits: 2 },

  // Asia partners
  { country: "China", code: "CNY", symbol: "¥", decimalDigits: 2 },
  { country: "Japan", code: "JPY", symbol: "¥", decimalDigits: 0 },
  { country: "South Korea", code: "KRW", symbol: "₩", decimalDigits: 0 },
  { country: "Bangladesh", code: "BDT", symbol: "৳", decimalDigits: 2 },
  { country: "Sri Lanka", code: "LKR", symbol: "Rs", decimalDigits: 2 },

  // Others frequently used in trade
  { country: "Australia", code: "AUD", symbol: "$", decimalDigits: 2 },
  { country: "Canada", code: "CAD", symbol: "$", decimalDigits: 2 },
  { country: "Switzerland", code: "CHF", symbol: "CHF", decimalDigits: 2 },
  { country: "South Africa", code: "ZAR", symbol: "R", decimalDigits: 2 },
  { country: "Brazil", code: "BRL", symbol: "R$", decimalDigits: 2 },
];

export const seedCurrency = async () => {

  const ops = currencies.map((c) => ({
    updateOne: {
      filter: { country: c.country },
      update: {
        $setOnInsert: { ...c, isActive: true },
      },
      upsert: true,
    },
  }));

  await currencyModel.bulkWrite(ops);

  console.log("Currency seeded");
  process.exit(0);
};