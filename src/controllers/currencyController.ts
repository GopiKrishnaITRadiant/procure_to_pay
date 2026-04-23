import { Request, Response, NextFunction } from "express";
import { currencyModel } from "../models/currencyModel";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";
import { Types } from "mongoose";

const normalizeName = (v: string) => v.trim().toUpperCase();
const normalizeSymbol = (v: string) => v.trim();

const validateInput = (name: string, symbol: string) => {
  if (!name || !symbol) {
    throw new ApiError(400, "Name and symbol are required");
  }
};

export const createCurrency = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { country,countryCode, symbol, decimalDigits = 2, isActive = true } = req.body;

    validateInput(country, symbol);

    country = normalizeName(country);
    symbol = normalizeSymbol(symbol);

    if (decimalDigits < 0 || decimalDigits > 6) {
      throw new ApiError(400, "Invalid decimalDigits");
    }

    const exists = await currencyModel.findOne({
      $or: [{ country }, { symbol }],
    });

    if (exists) {
      throw new ApiError(400, "Currency already exists");
    }

    const currency = await currencyModel.create({
      country,
      symbol,
      code: countryCode,
      decimalDigits,
      isActive,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Currency created",
      data: currency,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCurrencies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const filter: any = {};

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }

    const [data, total] = await Promise.all([
      currencyModel
        .find(filter)
        .lean()
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      currencyModel.countDocuments(filter),
    ]);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Currencies fetched",
      data: { data, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};
export const updateCurrency = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, symbol, decimalDigits, isActive } = req.body;

    const update: any = {};

    if (name) update.name = normalizeName(name);
    if (symbol) update.symbol = normalizeSymbol(symbol);

    if (decimalDigits !== undefined) {
      if (decimalDigits < 0 || decimalDigits > 6) {
        throw new ApiError(400, "Invalid decimalDigits");
      }
      update.decimalDigits = decimalDigits;
    }

    if (isActive !== undefined) update.isActive = isActive;

    // Build OR conditions safely
    const orConditions: any[] = [];

    if (update.name) orConditions.push({ name: update.name });
    if (update.symbol) orConditions.push({ symbol: update.symbol });

    if (orConditions.length > 0) {
      const exists = await currencyModel.findOne({
        _id: { $ne: new Types.ObjectId(req.params.id as string) },
        $or: orConditions,
      });

      if (exists) {
        throw new ApiError(400, "Duplicate currency");
      }
    }

    const currency = await currencyModel.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );

    if (!currency) {
      throw new ApiError(404, "Currency not found");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Currency updated",
      data: currency,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateCurrency = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currency = await currencyModel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!currency) {
      throw new ApiError(404, "Currency not found");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Currency deactivated",
      data: currency,
    });
  } catch (error) {
    next(error);
  }
};