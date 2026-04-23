import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { UOMConversionModel } from "../models/uomConversionModel";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";

// utils
const toBool = (val: any) => val === "true" || val === true;

//CREATE
export const createUOMConversion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let {
      fromUOM,
      toUOM,
      category,
      factor,
      description,
      reverseFactor,
      isActive = true,
    } = req.body;

    if (!fromUOM || !toUOM || !factor) {
      throw new ApiError(400, "fromUOM, toUOM and factor are required");
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    if (factor <= 0) {
      throw new ApiError(400, "Factor must be greater than 0");
    }

    // auto calculate reverse factor if not provided
    if (!reverseFactor) {
      reverseFactor = 1 / factor;
    }

    const exists = await UOMConversionModel.findOne({
      fromUOM,
      toUOM,
    });

    if (exists) {
      throw new ApiError(409, "Conversion already exists");
    }

    const conversion = await UOMConversionModel.create({
      fromUOM,
      toUOM,
      category,
      description,
      factor,
      reverseFactor,
      isActive,
      createdBy: userId,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Conversion created successfully",
      data: conversion,
    });
  } catch (err: any) {
    next(err);
  }
};

//LIST
export const getUOMConversions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const filter: any = {};

    if (req.query.category)
      filter.category = { $regex: req.query.category, $options: "i" };
    if (req.query.isActive !== undefined)
      filter.isActive = toBool(req.query.isActive);

    const [data, total] = await Promise.all([
      UOMConversionModel.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      UOMConversionModel.countDocuments(filter),
    ]);

    return sendResponse({
      res,
      data,
      meta: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    next(err);
  }
};

//GET BY ID
export const getUOMConversionById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { uomConverstionId } = req.params;
    const conversion =
      await UOMConversionModel.findById({ _id: uomConverstionId }).lean();

    if (!conversion) {
      throw new ApiError(
        404,
        "UOM Conversion not found",
        "conversion not found",
      );
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Conversion found successfully",
      data: conversion,
    });
  } catch (err: any) {
    next(err);
  }
};

//UPDATE
export const updateUOMConversion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { uomConverstionId } = req.params;

    const existing = await UOMConversionModel.findById(uomConverstionId).lean();
    if (!existing) {
      throw new ApiError(404, "Conversion not found");
    }

    const update: any = {};

    if (req.body.fromUOM) update.fromUOM = req.body.fromUOM;
    if (req.body.toUOM) update.toUOM = req.body.toUOM;
    if (req.body.category) update.category = req.body.category;

    if (req.body.factor !== undefined) {
      if (req.body.factor <= 0) {
        throw new ApiError(400, "Factor must be > 0");
      }
      update.factor = req.body.factor;
      update.reverseFactor = 1 / req.body.factor;
    }

    if (req.body.isActive !== undefined) {
      update.isActive = toBool(req.body.isActive);
    }

    // final values for duplicate check
    const finalFrom = update.fromUOM || existing.fromUOM;
    const finalTo = update.toUOM || existing.toUOM;

    const duplicate = await UOMConversionModel.findOne({
      _id: { $ne: new Types.ObjectId(uomConverstionId as string) },
      fromUOM: finalFrom,
      toUOM: finalTo,
    });

    if (duplicate) {
      throw new ApiError(409, "Conversion already exists");
    }

    const updated = await UOMConversionModel.findByIdAndUpdate(uomConverstionId, update, {
      new: true,
      runValidators: true,
    });

    return sendResponse({
      res,
      statusCode: 200,
      message: "Conversion updated successfully",
      data: updated,
    });
  } catch (err: any) {
    next(err);
  }
};
