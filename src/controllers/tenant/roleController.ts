import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { ApiError } from "../../utils/apiErrors";


export const createOrUpdateRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roleId } = req.params;
    const { name, permissions, isActive } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    if (!name) {
      throw new ApiError(400, "Role name is required", "VALIDATION_ERROR");
    }

    if (!Array.isArray(permissions)) {
      throw new ApiError(400, "Permissions must be an array", "VALIDATION_ERROR");
    }

    const Role = req.tenantConnection.model("Role");

    let role;

    if (roleId) {
      // UPDATE
      role = await Role.findById(roleId);

      if (!role) {
        throw new ApiError(404, "Role not found", "NOT_FOUND");
      }

      role.name = name.trim();
      role.permissions = permissions;

      if (typeof isActive === "boolean") {
        role.isActive = isActive;
      }

      await role.save();

    } else {
      // CREATE
      const existingRole = await Role.findOne({ name: name.trim() });

      if (existingRole) {
        throw new ApiError(409, "Role already exists", "DUPLICATE_ROLE");
      }

      role = await Role.create({
        name: name.trim(),
        permissions,
        isActive: isActive ?? true
      });
    }

    return sendResponse({
      res,
      statusCode: roleId ? 200 : 201,
      message: roleId ? "Role updated successfully" : "Role created successfully",
      data: role,
    });

  } catch (error) {
    next(error);
  }
};

export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Role = req.tenantConnection.model("Role");

    const pageNumber = Math.max(1, parseInt(page as string, 10));
    const limitNumber = Math.min(Math.max(1, parseInt(limit as string, 10)), 100);

    const query: any = {};
    if (search) query.name = { $regex: search, $options: "i" };

    const totalRoles = await Role.countDocuments(query);

    const roles = await Role.find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalPages = Math.ceil(totalRoles / limitNumber);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Roles retrieved successfully",
      data: roles,
      meta: { totalRoles, totalPages, currentPage: pageNumber, pageSize: limitNumber },
    });
  } catch (error: any) {
    next(error);
  }
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  const { roleId } = req.params;

  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Role = req.tenantConnection.model("Role");

    const role = await Role.findById(roleId);
    if (!role) throw new ApiError(404, "Role not found", "NOT_FOUND");

    return sendResponse({
      res,
      statusCode: 200,
      message: "Role retrieved successfully",
      data: role,
    });
  } catch (error: any) {
    next(error);
  }
};

export const removeRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roleId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    if (!roleId) {
      throw new ApiError(400, "Role id is required", "VALIDATION_ERROR");
    }

    const Role = req.tenantConnection.model("Role");

    const role = await Role.findByIdAndUpdate(
      roleId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!role) {
      throw new ApiError(404, "Role not found", "NOT_FOUND");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Role deleted successfully",
      data: role,
    });
  } catch (error) {
    next(error);
  }
};