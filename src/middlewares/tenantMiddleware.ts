import { Request, Response, NextFunction } from "express";
import tenantModel from "../models/tenantModel";

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let tenantId: string | undefined;

    if (req.user?.tenantId) {
      tenantId = req.user.tenantId;
    }

    if (!tenantId) {
      return res.status(400).json({
        message: "Tenant ID missing",
      });
    }

    const tenant = await tenantModel.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found",
      });
    }

    if (tenant.status !== "active") {
      return res.status(403).json({
        message: "Tenant is inactive",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};