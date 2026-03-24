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
  userType: "TENANT"|"PLATFORM";
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

  } catch (error) {
    next(error)
  }
};