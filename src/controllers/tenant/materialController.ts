import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { ApiError } from "../../utils/apiErrors";
import { Types } from "mongoose";
import { IMaterial } from "../../models/tenant/materialsModel";

export const createMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const {
      materialCode,
      description,
      categoryId,
      unitOfMeasure,
      price,
      currency,
    } = req.body;

    if (!materialCode || !description || !unitOfMeasure) {
      throw new ApiError(
        400,
        "Material code, description, and unit of measure are required",
        "ValidationError"
      );
    }

    const MaterialModel = req.tenantConnection.model<IMaterial>("Material");

    const existingMaterial = await MaterialModel.findOne({ materialCode });
    if (existingMaterial) {
      throw new ApiError(
        409,
        "Material already exists with this code",
        "ValidationError"
      );
    }

    const newMaterial = await MaterialModel.create({
      materialCode,
      description,
      categoryId,
      unitOfMeasure,
      price,
      currency,
      isActive: true,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Material created successfully",
      data: newMaterial,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const { materialId } = req.params;
    const {
      materialCode,
      description,
      categoryId,
      unitOfMeasure,
      price,
      currency,
      isActive,
    } = req.body;

    const MaterialModel = req.tenantConnection.model<IMaterial>("Material");

    const materialDoc = await MaterialModel.findById(materialId);
    if (!materialDoc) {
      throw new ApiError(404, "Material not found", "NotFoundError");
    }

    if (materialCode && materialCode !== materialDoc.materialCode) {
      const existingMaterial = await MaterialModel.findOne({ materialCode });
      if (existingMaterial) {
        throw new ApiError(
          409,
          "Another material with this code already exists",
          "ValidationError"
        );
      }
      materialDoc.materialCode = materialCode;
    }

    if (description) materialDoc.description = description;
    if (categoryId) materialDoc.categoryId = categoryId;
    if (unitOfMeasure) materialDoc.unitOfMeasure = unitOfMeasure;
    if (price !== undefined) materialDoc.price = price;
    if (currency) materialDoc.currency = currency;
    if (isActive !== undefined) materialDoc.isActive = isActive;

    materialDoc.updatedAt = new Date();

    await materialDoc.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Material updated successfully",
      data: materialDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllMaterials = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const MaterialModel = req.tenantConnection.model<IMaterial>("Material");

    const materials = await MaterialModel.find({ isActive: true }).sort({ description: 1 });

    return sendResponse({
      res,
      statusCode: 200,
      message: "Materials fetched successfully",
      data: materials,
    });
  } catch (error) {
    next(error);
  }
};

export const getOneMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const { materialId } = req.params;

    const MaterialModel = req.tenantConnection.model<IMaterial>("Material");

    const materialDoc = await MaterialModel.findById(materialId);
    if (!materialDoc || !materialDoc.isActive) {
      throw new ApiError(404, "Material not found", "NotFoundError");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Material fetched successfully",
      data: materialDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const { materialId } = req.params;

    const MaterialModel = req.tenantConnection.model<IMaterial>("Material");

    const materialDoc = await MaterialModel.findById(materialId);
    if (!materialDoc) {
      throw new ApiError(404, "Material not found", "NotFoundError");
    }

    materialDoc.isActive = false;
    materialDoc.updatedAt = new Date();
    await materialDoc.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Material removed (soft delete) successfully",
    });
  } catch (error) {
    next(error);
  }
};