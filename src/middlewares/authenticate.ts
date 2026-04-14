import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getTenantConnection } from "../core/tenantConnection";
import { IRole } from "../models/tenant/rolesModel";
import { platformUserModel } from "../models/platformUserModel";
import { ApiError } from "../utils/apiErrors";
import { ENV } from "../config/env";

interface AuthJwtPayload {
  userId: string;
  tenantId: string;
  userType: "TENANT"|"PLATFORM"|"VENDOR";
  companyCode:string;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401,'Authentication required')
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token as string,
      ENV.JWT_SECRET as string
    ) as AuthJwtPayload;

    if (!decoded?.userId || !decoded?.userType) {
      throw new ApiError(401,"Invalid token payload")
    }

    if (decoded.userType === "PLATFORM") {
      const user = await platformUserModel
        .findById(decoded.userId)
        .select("-password");

      if (!user) {
        throw new ApiError(401,'User not found')
      }

      req.user = {
        userId: user._id.toString(),
        userType: "PLATFORM",
        roleId: user.role.toString(),
        role: user.role.toString(),
        permissions: user.permissions,
        tenantId: "",
        companyCode:""
      };

      return next();
    }

    if (decoded.userType === "TENANT") {
      
      if (!decoded.companyCode) {
        return res.status(401).json({ message: "companyCode missing" });
      }
      const connection = await getTenantConnection(decoded.companyCode);
      req.tenantConnection = connection;

      const User = connection.model("User");

      const user = await User.findById(decoded.userId)
        .populate("role")
        .select("-password");

      if (!user) {
        throw new ApiError(401,"User not found")
      }

      req.user = {
        userId: user._id.toString(),
        tenantId: decoded.tenantId,
        companyCode:decoded.companyCode,
        userType: "TENANT",
        roleId: (user.role as IRole)._id.toString(),
        role: (user.role as IRole).name,
        permissions: (user.role as IRole).permissions,
        approvalLimit: user.approvalLimit,
      };

      return next();
    }

    if (decoded.userType === "VENDOR") {

      if (!decoded.companyCode) {
        throw new ApiError(401, "companyCode missing");
      }

      const connection = await getTenantConnection(decoded.companyCode);
      req.tenantConnection = connection;

      const VendorUser = connection.model("VendorUser");
      const Vendor = connection.model("Vendor");

      const vendorUser = await VendorUser.findById(decoded.userId)
        .populate("roleId")
        .select("-password");

      if (!vendorUser) {
        throw new ApiError(401, "Vendor user not found");
      }

      if (!vendorUser.isActive) {
        throw new ApiError(403, "Vendor user is inactive");
      }

      const vendor = await Vendor.findById(vendorUser.vendorId);

      if (!vendor) {
        throw new ApiError(401, "Vendor not found");
      }

      if (!vendor.isActive || vendor.status !== "APPROVED") {
        throw new ApiError(403, "Vendor is not approved");
      }

      const role = vendorUser.roleId as any;

      req.user = {
        userId: vendorUser._id.toString(),
        userType: "VENDOR",
        tenantId: decoded.tenantId,
        companyCode: decoded.companyCode,
        vendorId: vendor._id.toString(),
        roleId: role?._id?.toString(),
        role: role?.name,
        permissions: role?.permissions || [],
        // email: vendorUser.email,
      };

      return next();
    }

  } catch (error) {
    next(error)
  }
};