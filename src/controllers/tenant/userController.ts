import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../../utils/sendResponse';
import { ApiError } from '../../utils/apiErrors';
import bcrypt from "bcrypt"

export const addUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName, role, approvalLimit = 0, department } = req.body;
    const { user: adminUser } = req as any;
    const tenantId = adminUser.tenantId;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const User = req.tenantConnection.model("User");

    if (!email || !displayName || !role) {
      throw new ApiError(400, "email, displayName, and role are required", "VALIDATION_ERROR");
    }

    const existingUser = await User.findOne({ email: email.toLowerCase(), tenantId });
    if (existingUser) {
      throw new ApiError(409, "User with this email already exists", "CONFLICT");
    }

    if (approvalLimit > adminUser.approvalLimit) {
      throw new ApiError(
        403,
        `Cannot assign approval limit higher than your own (${adminUser.approvalLimit})`,
        "FORBIDDEN"
      );
    }

    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const newUser = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName,
      role:role,
      approvalLimit,
      department,
      tenantId: (tenantId),
      isActive: true,
      isVerified: false,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "User created successfully",
      data: {
        _id: newUser._id,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        approvalLimit: newUser.approvalLimit,
        department: newUser.department,
        isActive: newUser.isActive,
        tenantId: newUser.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req:Request, res:Response,next:NextFunction) => {
  try {
    if(!req.tenantConnection) {
      return res.status(500).json({ message: "Tenant connection not found" });
    }
    
    const User = req.tenantConnection.model("User");

    const user = await User.findById(req.params.userId).select("-password");

    if (!user) {
      throw new ApiError(404,'Uenant not found','user not found')
    }

    sendResponse({res,statusCode:200,message:"user found successfully",data:user})
  } catch (error) {
    next(error)
  }
};

export const getAllusers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "10", search = "" } = req.query;

    if (!req.tenantConnection) {
      return res.status(500).json({ message: "Tenant connection not found" });
    }

    const User = req.tenantConnection.model("User");

    const pageNumber = Math.max(1, parseInt(page as string, 10));
    const limitNumber = Math.min(Math.max(1, parseInt(limit as string, 10)), 100);

    const query: any = { isActive: true };

    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
      .select("-password")
      .populate("role", "name")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalPages = Math.ceil(totalUsers / limitNumber);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Users retrieved successfully",
      data: users,
      meta: {
        totalUsers,
        totalPages,
        currentPage: pageNumber,
        pageSize: limitNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { displayName, email, role, department, approvalLimit } = req.body;

    if (!req.tenantConnection) {
      throw new Error("Tenant connection not found");
    }

    const User = req.tenantConnection.model("User");

    const user = await User.findById(id);

    if (!user || !user.isActive) {
      return res.status(404).json({ message: "User not found" });
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (email !== undefined) user.email = email.toLowerCase();
    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;
    if (approvalLimit !== undefined) user.approvalLimit = approvalLimit;
    // if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const removeUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(404,"Tenant connection not found");
    }

    const User = req.tenantConnection.model("User");

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404,'User not found')
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "User removed successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};