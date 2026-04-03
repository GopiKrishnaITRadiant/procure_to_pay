import { Connection } from "mongoose";
import { IUser } from "../models/tenant/userModel";

interface IAuthUser {
  userId: string;
  tenantId: string;
  roleId: string;
  role: string;
  permissions: string[];
  approvalLimit?: number;
  department?: string;
  userType: "TENANT" | "PLATFORM" | "VENDOR";
  companyCode:string
  vendorId?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser;
      tenantConnection?: Connection;
    }
  }
}

// declare module "express-serve-static-core" {
//   interface Request {
//     user?: IAuthUser;
//     tenantConnection?: Connection;
//   }
// }