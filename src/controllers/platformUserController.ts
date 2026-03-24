import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { platformUserModel } from "../models/platformUserModel";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";
import { ENV } from "../config/env";

export const loginPlatformUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    const user = await platformUserModel.findOne({ email }).select("+password");

    if (!user || !user.status) {
      throw new ApiError(401, "Invalid credentials");
    }

    if (user.authProvider === "AZURE") {
      throw new ApiError(404, "Use Azure login");
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      throw new ApiError(401, "Invalid password");
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        userType: "PLATFORM",
      },
      ENV.JWT_SECRET!,
      { expiresIn: "1d" },
    );

    sendResponse({
      res,
      statusCode: 200,
      message: "Login Successfull",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSupportAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user?.role !== "SUPER_ADMIN") {
      throw new ApiError(403, "Access denied");
    }

    const { name, email, password,permissions } = req.body;

    const exists = await platformUserModel.findOne({ email });
    if (exists) {
      throw new ApiError(400, "Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const supportAdmin = await platformUserModel.create({
      name,
      email,
      password: hashedPassword,
      role: "SUPPORT_ADMIN",
      authProvider: "LOCAL",
      permissions
    });

    const support = {
      id: supportAdmin._id,
      name: supportAdmin.name,
      email: supportAdmin.email,
      role: supportAdmin.role,
      authProvider: supportAdmin.authProvider,
      createdAt: supportAdmin.createdAt,
      updatedAt: supportAdmin.updatedAt,
    };

    sendResponse({
      res,
      statusCode: 201,
      message: "Support created successfully",
      data: support,
    });
  } catch (error) {
    next(error);
  }
};

export const activateDeactivateSupportAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const {status}=req.body

    const supportDoc = await platformUserModel.findById(id);

    if (!supportDoc) {
      throw new ApiError(404, "Support user not found");
    }

    supportDoc.status=status
    await supportDoc.save()

    sendResponse({
      res,
      statusCode: 200,
      message: "Support admin deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
