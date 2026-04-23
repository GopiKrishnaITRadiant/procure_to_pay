import {Request, Response, NextFunction} from "express";
import {ApiError} from "../utils/apiErrors";
import {sendResponse} from "../utils/sendResponse";
import { exchangeRatesModel } from "../models/exchangeRateModel";
import { Types } from "mongoose";

export const  upsertExchangeRate=async(req:Request,res:Response,next:NextFunction)=> {
    try {
        
    } catch (error) {
        next(error)
    }
}
export const getAllExchangeRates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = 1,
      limit = 20,
      baseCurrency,
      targetCurrency,
      rateType,
      isActive,
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Number(limit), 100);
    const skip = (pageNumber - 1) * limitNumber;

    //Build filter dynamically
    const filter: any = {};

    if (baseCurrency) {
      filter.baseCurrency = String(baseCurrency).toUpperCase();
    }

    if (targetCurrency) {
      filter.targetCurrency = String(targetCurrency).toUpperCase();
    }

    if (rateType) {
      filter.rateType = rateType;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const [data, total] = await Promise.all([
      exchangeRatesModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      exchangeRatesModel.countDocuments(filter),
    ]);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Exchange rates fetched successfully",
      data,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExchangeRateById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { exchangeRateId } = req.params;

    if (!Types.ObjectId.isValid(exchangeRateId as string)) {
      throw new ApiError(400, "Invalid exchange rate ID");
    }

    const rate = await exchangeRatesModel
      .findById(exchangeRateId)
      .lean();

    if (!rate) {
      throw new ApiError(404, "Exchange rate not found");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Exchange rate fetched successfully",
      data: rate,
    });
  } catch (error) {
    next(error);
  }
};