import {Request, Response, NextFunction} from "express";
import { sendResponse } from "../../utils/sendResponse";
import { ApiError } from "../../utils/apiErrors";
import { Types } from "mongoose";

export const approveRegisteredVendor = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { vendorUserId } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");
    const VendorUser = req.tenantConnection.model("VendorUser");
    const VendorRole = req.tenantConnection.model("VendorRole");

    const user = await VendorUser.findById(vendorUserId);

    if (!user) {
      throw new ApiError(404, "Vendor user not found", "NOT_FOUND");
    }

    if (!user.isEmailVerified) {
      throw new ApiError(400, "Vendor email not verified", "EMAIL_NOT_VERIFIED");
    }

    const vendor = await Vendor.findById(user.vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "NOT_FOUND");
    }

    if (vendor.status === "BLOCKED") {
      throw new ApiError(400, "Vendor is blocked", "INVALID_STATE");
    }

    if (vendor.status === "APPROVED") {
      throw new ApiError(400, "Vendor already approved", "ALREADY_APPROVED");
    }

    const adminRole = await VendorRole.findOne({
      vendorId: vendor._id,
      name: "ADMIN",
    });

    if (!adminRole) {
      throw new ApiError(400, "ADMIN role not found", "ROLE_NOT_FOUND");
    }

    user.roleId = adminRole._id;
    await user.save();

    vendor.status = "APPROVED";
    vendor.approvedAt = new Date();
    vendor.approvedBy = new Types.ObjectId(req.user?.userId);

    await vendor.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Vendor approved and activated successfully",
      data: {
        vendor,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectVendor = async (req: Request, res: Response, next: NextFunction) => {
  const { vendorId } = req.params;
  const { reason } = req.body;

  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "NOT_FOUND");
    }

    if (vendor.status !== "APPROVED") {
      throw new ApiError(400, "Only approved vendors can be rejected", "INVALID_STATE");
    }

    vendor.status = "REJECTED";
    vendor.rejectedReason = reason;
    vendor.isActive = false;

    await vendor.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Vendor rejected",
    });

  } catch (error) {
    next(error);
  }
};
