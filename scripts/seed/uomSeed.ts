import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import {UOMModel} from "../../src/models/uomModel"
import {UOMConversionModel} from "../../src/models/uomConversionModel"

type UOMType = {
  code: string;
  name: string;
  category: string;
  isBaseUnit?: boolean;
  precision: number;
  isActive: boolean;
};

type ConversionType = {
  fromUOM: string;
  toUOM: string;
  factor: string;
  category: string;
  isActive: boolean;
};

const createDefaultUOMs = (): UOMType[] => {
  return [
    // COUNT
    { code: "EA", name: "Each", category: "COUNT", isBaseUnit: true, precision: 0, isActive: true },
    { code: "PCS", name: "Pieces", category: "COUNT", precision: 0, isActive: true },
    { code: "BOX", name: "Box", category: "COUNT", precision: 0, isActive: true },

    // WEIGHT
    { code: "KG", name: "Kilogram", category: "WEIGHT", isBaseUnit: true, precision: 3, isActive: true },
    { code: "G", name: "Gram", category: "WEIGHT", precision: 3, isActive: true },
    { code: "MG", name: "Milligram", category: "WEIGHT", precision: 3, isActive: true },
    { code: "TON", name: "Ton", category: "WEIGHT", precision: 3, isActive: true },
    { code: "LB", name: "Pound", category: "WEIGHT", precision: 3, isActive: true },

    // VOLUME
    { code: "L", name: "Litre", category: "VOLUME", isBaseUnit: true, precision: 3, isActive: true },
    { code: "ML", name: "Millilitre", category: "VOLUME", precision: 3, isActive: true },
    { code: "CL", name: "Centilitre", category: "VOLUME", precision: 3, isActive: true },
    { code: "GAL", name: "Gallon", category: "VOLUME", precision: 3, isActive: true },
    { code: "CBM", name: "Cubic Meter", category: "VOLUME", precision: 3, isActive: true },

    // LENGTH
    { code: "M", name: "Meter", category: "LENGTH", isBaseUnit: true, precision: 3, isActive: true },
    { code: "CM", name: "Centimeter", category: "LENGTH", precision: 3, isActive: true },
    { code: "MM", name: "Millimeter", category: "LENGTH", precision: 3, isActive: true },
    { code: "KM", name: "Kilometer", category: "LENGTH", precision: 3, isActive: true },

    // AREA
    { code: "SQM", name: "Square Meter", category: "AREA", isBaseUnit: true, precision: 3, isActive: true },
    { code: "SQFT", name: "Square Foot", category: "AREA", precision: 3, isActive: true },
    { code: "ACRE", name: "Acre", category: "AREA", precision: 3, isActive: true },
  ];
};

const UOM_CATEGORY_MAP: Record<string, "COUNT" | "WEIGHT" | "VOLUME" | "LENGTH" | "AREA"> = {
  // COUNT
  EA: "COUNT",
  PCS: "COUNT",
  BOX: "COUNT",
  DOZEN: "COUNT",
  PACK: "COUNT",
  CARTON: "COUNT",

  // WEIGHT
  KG: "WEIGHT",
  G: "WEIGHT",
  MG: "WEIGHT",
  TON: "WEIGHT",
  LB: "WEIGHT",

  // VOLUME
  L: "VOLUME",
  ML: "VOLUME",
  CL: "VOLUME",
  GAL: "VOLUME",
  CBM: "VOLUME",

  // LENGTH
  M: "LENGTH",
  CM: "LENGTH",
  MM: "LENGTH",
  KM: "LENGTH",
  FT: "LENGTH",

  // AREA
  SQM: "AREA",
  SQFT: "AREA",
  ACRE: "AREA",
};

const inferCategory = (uom: string) => {
  return UOM_CATEGORY_MAP[uom.toUpperCase()] || "COUNT";
};

const createDefaultConversions = (): ConversionType[] => {
  const baseConversions = [
    // ===== WEIGHT =====
    { fromUOM: "KG", toUOM: "G", factor: "1000" },
    { fromUOM: "G", toUOM: "KG", factor: "0.001" },
    { fromUOM: "TON", toUOM: "KG", factor: "1000" },
    { fromUOM: "KG", toUOM: "TON", factor: "0.001" },
    { fromUOM: "KG", toUOM: "LB", factor: "2.20462" },
    { fromUOM: "LB", toUOM: "KG", factor: "0.453592" },

    // ===== VOLUME =====
    { fromUOM: "L", toUOM: "ML", factor: "1000" },
    { fromUOM: "ML", toUOM: "L", factor: "0.001" },
    { fromUOM: "L", toUOM: "CL", factor: "100" },
    { fromUOM: "CL", toUOM: "L", factor: "0.01" },
    { fromUOM: "L", toUOM: "GAL", factor: "0.264172" },
    { fromUOM: "GAL", toUOM: "L", factor: "3.78541" },
    { fromUOM: "CBM", toUOM: "L", factor: "1000" },
    { fromUOM: "L", toUOM: "CBM", factor: "0.001" },

    // ===== LENGTH =====
    { fromUOM: "M", toUOM: "CM", factor: "100" },
    { fromUOM: "CM", toUOM: "M", factor: "0.01" },
    { fromUOM: "M", toUOM: "MM", factor: "1000" },
    { fromUOM: "MM", toUOM: "M", factor: "0.001" },
    { fromUOM: "KM", toUOM: "M", factor: "1000" },
    { fromUOM: "M", toUOM: "KM", factor: "0.001" },
    { fromUOM: "M", toUOM: "FT", factor: "3.28084" },
    { fromUOM: "FT", toUOM: "M", factor: "0.3048" },

    // ===== AREA =====
    { fromUOM: "SQM", toUOM: "SQFT", factor: "10.7639" },
    { fromUOM: "SQFT", toUOM: "SQM", factor: "0.092903" },
    { fromUOM: "SQM", toUOM: "ACRE", factor: "0.000247105" },
    { fromUOM: "ACRE", toUOM: "SQM", factor: "4046.86" },

    // ===== PACKAGING (REAL WORLD ERP) =====
    { fromUOM: "BOX", toUOM: "EA", factor: "10" },
    { fromUOM: "EA", toUOM: "BOX", factor: "0.1" },
    { fromUOM: "DOZEN", toUOM: "EA", factor: "12" },
    { fromUOM: "EA", toUOM: "DOZEN", factor: "0.0833333" },
    { fromUOM: "PACK", toUOM: "EA", factor: "6" },
    { fromUOM: "EA", toUOM: "PACK", factor: "0.166667" },
    { fromUOM: "CARTON", toUOM: "BOX", factor: "4" },
    { fromUOM: "BOX", toUOM: "CARTON", factor: "0.25" },
  ];

  return baseConversions.map((c) => ({
    ...c,
    category: inferCategory(c.fromUOM),
    isActive: true,
  }));
};

export const seedUOMMaster = async () => {
  try {
    console.log("Seeding UOMs & Conversions...");

    const uoms = createDefaultUOMs();
    const conversions = createDefaultConversions();

    /* ===== UOM UPSERT ===== */
    for (const uom of uoms) {
      await UOMModel.updateOne(
        { code: uom.code },
        { $set: uom },
        { upsert: true }
      );
    }

    /* ===== CONVERSIONS UPSERT ===== */
    for (const conv of conversions) {
      await UOMConversionModel.updateOne(
        { fromUOM: conv.fromUOM, toUOM: conv.toUOM },
        { $set: conv },
        { upsert: true }
      );
    }

    console.log("UOM Master & Conversions seeded successfully");

  } catch (error) {
    console.error("Seeder failed:", error);
  } finally {
    // await mongoose.connection.close();
  }
};