import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { generateInternalToken } from "../../services/tokenService";
import { verifyAzureToken } from "../../middlewares/verifyAzuretoken";

import { sendResponse } from "../../utils/sendResponse";
import { ApiError } from "../../utils/apiErrors";
import { getTenantConnection } from "../../core/tenantConnection";
import tenantModel from "../../models/tenantModel";

//tenant login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      type,
      azureToken,
      email,
      password,
      tenantId,
    }: {
      type: "AZURE" | "LOCAL";
      azureToken?: string;
      email?: string;
      password?: string;
      tenantId?: string;
    } = req.body;

    if (!type || !tenantId) {
      throw new ApiError(
        400,
        "Login type and tenantId are required",
        "VALIDATION_ERROR",
      );
    }

    const tenantDoc = await tenantModel.findById(tenantId)

    if(!tenantDoc){
      throw new ApiError(404,'Tenant not found')
    }

    const connection = await getTenantConnection(tenantDoc.companyCode);

    const userModel = connection.model("User");

    let user: any;

    if (type === "AZURE") {
      if (!azureToken) {
        throw new ApiError(
          400,
          "Azure token is required",
          "VALIDATION_ERROR",
        );
      }

      const decoded: any = await verifyAzureToken(azureToken);
      const emailFromAzure = decoded.preferred_username?.toLowerCase();

      if (!emailFromAzure) {
        throw new ApiError(
          400,
          "Email not found in Azure token",
          "VALIDATION_ERROR",
        );
      }

      user = await userModel
        .findOne({ email: emailFromAzure })
        .populate("role");
      
      if (!user) {
        throw new ApiError(
          403,
          "User not registered in this tenant",
          "ACCESS_DENIED",
        );
      }
    }

    if (type === "LOCAL") {
      if (!email || !password) {
        throw new ApiError(
          400,
          "Email and password are required",
          "VALIDATION_ERROR",
        );
      }

      user = await userModel
        .findOne({ email: email.toLowerCase() })
        .select("+password")
        .populate("role");

      if (!user) {
        throw new ApiError(
          401,
          "Invalid credentials",
          "INVALID_CREDENTIALS",
        );
      }

      const isMatch = await bcrypt.compare(
        password,
        user.password,
      );

      if (!isMatch) {
        throw new ApiError(
          401,
          "Invalid credentials",
          "INVALID_CREDENTIALS",
        );
      }
    }

    if (!user) {
      throw new ApiError(400, "Invalid login type", "VALIDATION_ERROR");
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        "User account is inactive",
        "ACCOUNT_DISABLED",
      );
    }

    const permissions =
      (user.role as any)?.permissions || [];

    const token = generateInternalToken({
      userId: user._id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      roleId: user.role?._id,
      permissions,
      userType: "TENANT",
      companyCode:tenantDoc.companyCode
    });

    return sendResponse({
      res,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role?._id,
          permissions,
        },
      },
    });

  } catch (error) {
    next(error);
  }
};

//register other users ex:finance,manager
export const register = async(req:Request,res:Response,next:NextFunction)=>{
  try {
    
  } catch (error) {
    
  }
}

export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");
  } catch (error) {
    next(error);
  }
};
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");
  } catch (error) {
    next(error);
  }
};