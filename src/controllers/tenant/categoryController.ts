import { Request,Response,NextFunction } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { ApiError } from "../../utils/apiErrors";
import { Types } from "mongoose";

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name,description } = req.body;

    if (!name) {
      throw new ApiError(400, "Category name is required", "ValidationError");
    }

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const CategoryModel = req.tenantConnection.model("Category");

    const existingCategory = await CategoryModel.findOne({ name });

    if (existingCategory) {
      throw new ApiError(409, "Category already exists", "ValidationError");
    }

    const newCategory = await CategoryModel.create({
      name,
      description,
      isActive: true,
      createdBy: req.user?.userId,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name,description, isActive } = req.body;
    const { id } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const CategoryModel = req.tenantConnection.model("Category");

    const categoryDoc = await CategoryModel.findById(id);

    if (!categoryDoc) {
      throw new ApiError(404, "Category not found", "NotFoundError");
    }

    if (name) categoryDoc.name = name;
    if (isActive !== undefined) categoryDoc.isActive = isActive;
    if(description) categoryDoc.description=description
    categoryDoc.updatedBy = req.user?.userId;

    await categoryDoc.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Category updated successfully",
      data: categoryDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const CategoryModel = req.tenantConnection.model("Category");

    const categories = await CategoryModel.find({}).sort({ name: 1 });

    return sendResponse({
      res,
      statusCode: 200,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const removeCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const CategoryModel = req.tenantConnection.model("Category");

    const categoryDoc = await CategoryModel.findById(id);

    if (!categoryDoc) {
      throw new ApiError(404, "Category not found", "NotFoundError");
    }

    categoryDoc.isActive = false;
    categoryDoc.updatedBy = req.user?.userId;
    await categoryDoc.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Category removed (soft delete) successfully",
    });
  } catch (error) {
    next(error);
  }
};