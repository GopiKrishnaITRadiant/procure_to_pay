import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { Types } from "mongoose";
import { generateVendorCode } from "../../utils/codeGenerator";
import { seedVendorRoles } from "../../helpers/vendorRoleSeed";
import bcrypt from "bcrypt";

export const createVendorByAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      email,
      phone,
      phoneCountryCode,
      country,
      vendorCategory,
      password,
    } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const tenantConnection = req.tenantConnection;

    const Vendor = tenantConnection.model("Vendor");
    const VendorUser = tenantConnection.model("VendorUser");
    const VendorRole = tenantConnection.model("VendorRole");

    const existing = await VendorUser.findOne({ email });
    if (existing) {
      throw new ApiError(400, "Email already exists", "DUPLICATE_EMAIL");
    }

    const code = await generateVendorCode(tenantConnection);

    //create vendor (AUTO APPROVED)
    const vendor = await Vendor.create({
      companyName: name,
      code,
      vendorType: "EXTERNAL",
      onboardingSource: "ADMIN",

      status: "ACTIVE",
      isActive: true,

      approvedAt: new Date(),
      approvedBy: req.user?.userId,

      email,
      phone,
      phoneCountryCode,
      country,
      vendorCategory,

      capabilities: {
        portalAccess: true,
        canParticipateInRFQ: true,
        canReceivePO: true,
        canSubmitInvoice: true,
      },

      createdBy: req.user?.userId,
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    // create ADMIN user for vendor
    const user = await VendorUser.create({
      vendorId: vendor._id,
      email,
      password: hashedPassword,
      role: "ADMIN",
      authProvider: "LOCAL",
      isEmailVerified: true,
      isActive: true,
    });

    await seedVendorRoles(VendorRole, vendor._id);

    sendResponse({
      res,
      statusCode: 201,
      message: "Vendor created and activated successfully",
      data: {
        vendorId: vendor._id,
        userId: user._id,
      },
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