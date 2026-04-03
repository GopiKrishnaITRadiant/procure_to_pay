import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { Types } from "mongoose";
import { generateVendorCode } from "../../utils/codeGenerator";

export const createVendorUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, role } = req.body;

  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");
    const VendorUser = req.tenantConnection.model("VendorUser");

    const vendorId = req.user?.vendorId;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "NOT_FOUND");
    }

    if (!["APPROVED", "ACTIVE"].includes(vendor.status)) {
      throw new ApiError(403, "Vendor is not allowed to add users", "INVALID_STATE");
    }

    if (!vendor.capabilities.portalAccess) {
      throw new ApiError(403, "Portal access is disabled", "FORBIDDEN");
    }

    if (req.user?.role !== "ADMIN") {
      throw new ApiError(403, "Only vendor admin can add users", "FORBIDDEN");
    }

    const existing = await VendorUser.findOne({ email });
    if (existing) {
      throw new ApiError(400, "User already exists", "DUPLICATE_USER");
    }

    const user = await VendorUser.create({
      vendorId,
      name,
      email,
      password,
      role: role || "STAFF",
    });

    res.status(201).json({
      success: true,
      data: user,
    });

  } catch (error) {
    next(error);
  }
};

export const updateVendor = async (req: Request, res: Response, next: NextFunction) => {
  const { vendorId } = req.params;
  const updateData = req.body;

  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        ...updateData,
        updatedBy: new Types.ObjectId(req.user?.userId),
      },
      { new: true }
    );

    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const getOneVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");

    const vendor = await Vendor.findById(vendorId).lean();

    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "NOT_FOUND");
    }

    sendResponse({
      res,
      statusCode: 200,
      data: vendor,
      message: "Vendor fetched successfully",
    });

  } catch (error) {
    next(error);
  }
};

export const removeVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");

    const vendor = await Vendor.findOne({
      _id: vendorId,
      isActive: true,
      status: { $ne: "BLOCKED" },
    });

    if (!vendor) {
      throw new ApiError(404, "Vendor not found or already blocked", "NOT_FOUND");
    }

    vendor.status = "BLOCKED";
    vendor.isActive = false;
    vendor.blockedReason = "Removed by admin";

    await vendor.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Vendor blocked successfully",
    });

  } catch (error) {
    next(error);
  }
};

export const getAllVendors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");

    const {
      page = 1,
      limit = 10,
      search,
      status,
      vendorType,
      onboardingSource,
    } = req.query as any;

    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};

    if (status) filter.status = status;
    if (vendorType) filter.vendorType = vendorType;
    if (onboardingSource) filter.onboardingSource = onboardingSource;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      Vendor.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Vendor.countDocuments(filter),
    ]);

    sendResponse({
      res,
      statusCode: 200,
      data: {
        vendors,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
      message: "Vendors fetched successfully",
    });

  } catch (error) {
    next(error);
  }
};