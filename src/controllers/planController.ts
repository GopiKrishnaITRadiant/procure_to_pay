import { Request, Response, NextFunction } from "express";
import planModel from "../models/planModel";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";
import { generatePlanCode } from "../utils/codeGenerator";


export const createPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      planName,
      planType,
      pricing,
      description,
      features = {},
      limits,
      trialDays = 0,
      isPublic = true,
      isActive = true,
    } = req.body;

    if (!planName || !planType || !pricing || !Array.isArray(pricing) || pricing.length === 0) {
      throw new ApiError(
        400,
        "Plan name, plan type, and pricing are required",
        "VALIDATION_ERROR"
      );
    }

    let planCode = "";
    let attempts = 0;

    while (attempts < 5) {
      planCode = generatePlanCode(planName);
      const exists = await planModel.findOne({ planCode }).lean();
      if (!exists) break;
      attempts++;
    }

    if (attempts === 5) {
      throw new ApiError(
        500,
        "Failed to generate unique plan code",
        "INTERNAL_ERROR"
      );
    }

    const newplan = await planModel.create({
      displayName: planName,
      planCode,
      description,
      pricing,
      features,
      limits,
      trialDays,
      isPublic,
      isActive,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "plan created successfully",
      data: newplan,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { page = 1, limit = 10, search = "", isActive = "true" } = req.query;

  try {
    const pageNumber = Math.max(1, parseInt(page as string, 10));
    const limitNumber = Math.min(
      Math.max(1, parseInt(limit as string, 10)),
      100,
    );

    const query: any = { isActive: isActive === "true" };

    if (search) {
      query.planName = { $regex: search, $options: "i" };
    }

    const totalplans = await planModel.countDocuments(query);

    const plans = await planModel
      .find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalPages = Math.ceil(totalplans / limitNumber);

    return sendResponse({
      res,
      statusCode: 200,
      message: "plans retrieved successfully",
      data: plans,
      meta: {
        totalplans,
        totalPages,
        currentPage: pageNumber,
        pageSize: limitNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  try {
    const plan = await planModel.findById(id);

    if (!plan) {
      throw new ApiError(404,"Sbuscription not found")
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "plan retrieved successfully",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  const {
    billingCycle,
    pricing,
    description,
    features = {},
    limits,
    trialDays = 0,
    isPublic = true,
    isActive = true, } =req.body;
  try {
    const plan = await planModel.findById(id);

    if (!plan) {
      return res.status(404).json({
        message: "plan not found",
      });
    }

    // plan.planCode = planName || plan.planCode;
    plan.pricing = pricing || plan.pricing;
    plan.description = description || plan.description;
    plan.features = features || plan.features;
    plan.isActive =
      isActive !== undefined ? isActive : plan.isActive;
    plan.limits=limits||plan.limits
    plan.trialDays=trialDays||plan.trialDays
    plan.isPublic =
      isPublic !== undefined ? isPublic : plan.isPublic;

    await plan.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "plan updated successfully",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  try {
    const plan = await planModel.findById(id);

    if (!plan) {
      return res.status(404).json({
        message: "plan not found",
      });
    }

    await plan.deleteOne();

    return sendResponse({
      res,
      statusCode: 200,
      message: "plan deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
