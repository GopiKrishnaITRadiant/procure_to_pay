import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { generateVendorCode } from "../../utils/codeGenerator";
import { seedVendorRoles } from "../../helpers/vendorRoleSeed";
import { getTenantConnection } from "../../core/tenantConnection";
import tenantModel from "../../models/tenantModel";

export const registerVendor = async (
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
      tenantId,
    } = req.body;

    if (!tenantId) {
      throw new ApiError(500, "TenantId not found", "VALIDATION_ERROR");
    }

    const tenantDoc=await tenantModel.findById(tenantId)

    if(!tenantDoc){
      throw new ApiError(500, "Tenant not found", "NOT_FOUND");
    }

    const tenantConnection = await getTenantConnection(tenantDoc.companyCode);

    if (!name || !email || !password || !country || !vendorCategory) {
      throw new ApiError(400, "Missing required fields", "VALIDATION_ERROR");
    }

    const Vendor = tenantConnection.model("Vendor");
    const VendorUser = tenantConnection.model("VendorUser");
    const VendorRole = tenantConnection.model("VendorRole");

    const existingUser = await VendorUser.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, "Email already registered", "DUPLICATE_EMAIL");
    }

    const code =await generateVendorCode(tenantConnection);

    const vendor = await Vendor.create({
      companyName:name,
      code: code,
      vendorType: "EXTERNAL",
      onboardingSource: "SELF",
      status: "DRAFT",
      tenantId,

      email,
      phone,
      phoneCountryCode,
      country,
      vendorCategory,

      isActive: false,
      createdBy: null,
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    await VendorUser.create({
      vendorId: vendor._id,
      email,
      password: hashedPassword,
      authProvider: "LOCAL",
      isEmailVerified: false,
      isActive: false,
    });

    await seedVendorRoles(VendorRole, vendor._id);

    // TODO: Send email verification link

    sendResponse({
      res,
      statusCode: 201,
      message: "Registration successful. Please verify your email.",
      data: { vendorId: vendor._id },
    });

  } catch (error) {
    next(error);
  }
};

export const verifyVendorEmail = async (req: Request, res:Response, next:NextFunction) => {
  try {
    const { token } = req.query;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const VendorUser = req.tenantConnection.model("VendorUser");

    const user = await VendorUser.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired token", "INVALID_TOKEN");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });

  } catch (error) {
    next(error);
  }
};

export const loginVendor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, tenantId } = req.body;

    const tenantDoc = await tenantModel.findById(tenantId)
    
    if(!tenantDoc){
      throw new ApiError(404,'Tenant not found')
    }
    
    const connection = await getTenantConnection(tenantDoc.companyCode);

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required", "VALIDATION_ERROR");
    }

    const VendorUser = connection.model("VendorUser");
    const Vendor = connection.model("Vendor");

    const user = await VendorUser.findOne({ email }).select("+password");

    if (!user) {
      throw new ApiError(401, "Invalid credentials", "INVALID_LOGIN");
    }

    if (!user.isActive) {
      throw new ApiError(403, "Account is inactive", "ACCOUNT_DISABLED");
    }

    if (!user.isEmailVerified) {
      throw new ApiError(403, "Please verify your email", "EMAIL_NOT_VERIFIED");
    }

    if (user.authProvider === "LOCAL") {
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        throw new ApiError(401, "Invalid credentials", "INVALID_LOGIN");
      }
    }

    const vendor = await Vendor.findById(user.vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "VENDOR_NOT_FOUND");
    }

    if (vendor.status !== "APPROVED") {
      throw new ApiError(
        403,
        "Vendor is not approved. Contact admin",
        "VENDOR_NOT_APPROVED"
      );
    }

    const token = jwt.sign(
      {
        vendorUserId: user._id,
        vendorId: vendor._id,
        userId: user._id,
        email: user.email,
        userType: "VENDOR",
        companyCode:tenantDoc.companyCode,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    sendResponse({
      res,
      statusCode: 200,
      message: "Login successful",
      data: {
        token,
        vendor: {
          id: vendor._id,
          name: vendor.name,
          code: vendor.code,
        },
      },
    });

  } catch (error) {
    next(error);
  }
};