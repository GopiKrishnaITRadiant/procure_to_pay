import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";
import { UOMModel } from "../models/uomModel";
import { Types } from "mongoose";

//create/update
export const createUpdateUOM = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let {
      code,
      name,
      symbol,
      category,
      isBaseUnit = false,
      precision = 2,
      isActive = true,
    } = req.body;

    if (!code || !name || !category) {
      throw new ApiError(400, "code, name, category are required");
    }

    code = code.toUpperCase().trim();

    let existingUOM = await UOMModel.findOne({ code });

    if (existingUOM) {
      existingUOM.name = name;
      existingUOM.symbol = symbol;
      existingUOM.category = category;
      existingUOM.isBaseUnit = isBaseUnit;
      existingUOM.precision = precision;
      existingUOM.isActive = isActive;

      await existingUOM.save();

      return sendResponse({
        res,
        statusCode: 200,
        message: "UOM updated successfully",
        data: existingUOM,
      });
    }

    if (isBaseUnit) {
      const baseExists = await UOMModel.findOne({
        category,
        isBaseUnit: true,
      });

      if (baseExists) {
        throw new ApiError(
          400,
          `Base unit already exists for category ${category}`
        );
      }
    }

    const newUOM = await UOMModel.create({
      code,
      name,
      symbol,
      category,
      isBaseUnit,
      precision,
      isActive,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "UOM created successfully",
      data: newUOM,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTenantUOMs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // pagination params
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    // optional search
    const search = (req.query.search as string)?.trim();

    const filter: any = {  };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const [data, total] = await Promise.all([
      UOMModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UOMModel.countDocuments(filter),
    ]);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant UOMs fetched successfully",
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateUOMs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { uoms } = req.body;

    if (!Array.isArray(uoms) || uoms.length === 0) {
      throw new ApiError(400, "uoms must be a non-empty array");
    }

    // Validate & build operations
    const bulkOps = uoms.map((item: any, index: number) => {
      if (!item._id || !Types.ObjectId.isValid(item._id)) {
        throw new ApiError(400, `Invalid _id at index ${index}`);
      }

      // remove _id from update payload
      const { _id, ...fieldsToUpdate } = item;

      if (Object.keys(fieldsToUpdate).length === 0) {
        throw new ApiError(
          400,
          `No fields to update for _id: ${_id}`
        );
      }

      return {
        updateOne: {
          filter: { _id },
          update: { $set: fieldsToUpdate },
        },
      };
    });

    const result = await UOMModel.bulkWrite(bulkOps, { ordered: false });

    return sendResponse({
      res,
      statusCode: 200,
      message: "UOMs updated successfully",
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};