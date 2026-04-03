import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ENV } from "../config/env";

type generateInternalTokenParams = {
  userId: mongoose.Types.ObjectId;
  tenantId:  mongoose.Types.ObjectId;
  roleId?:  mongoose.Types.ObjectId;
  permissions?: string[];
  userType: "TENANT" | "PLATFORM";
  companyCode:string;
};

export const generateInternalToken = (user: generateInternalTokenParams) => {
  return jwt.sign(
    {
      userId: user.userId,
      tenantId: user.tenantId,
      roleId: user.roleId,
      permissions: user.permissions,
      userType: user.userType,
      companyCode:user.companyCode
    },
    ENV.JWT_SECRET!,
    { expiresIn: "7d" }
  );
};