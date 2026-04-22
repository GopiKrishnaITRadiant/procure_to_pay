import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { Types } from "mongoose";
import { generateRequisitionNumber } from "../../utils/codeGenerator";

//create requisition and line items if line items not exists it will create but isMaterialCatalog will be false
export const createRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const { user, body } = req as any;

    const Requisition = req.tenantConnection.model("Requisition");
    const Material = req.tenantConnection.model("Material");

    const {
      department,
      requiredDate,
      currency,
      items,
      source = "MANUAL",
      externalId,
      skipApproval,
      procurementType,
      idempotencyKey,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items are required", "VALIDATION_ERROR");
    }

    if (idempotencyKey) {
      const existing = await Requisition.findOne({
        idempotencyKey: idempotencyKey,
        createdBy: user.userId,
      });

      if (existing){
        throw new ApiError(
          400,
          "Requisition with same idempotency key already exists",
          "DUPLICATE_IDEMPOTENCY_KEY"
        );
      }
    }

    const materialIds = items
      .filter((i: any) => i.materialId)
      .map((i: any) => new Types.ObjectId(i.materialId));

    const materials = materialIds.length
      ? await Material.find({
        _id: { $in: materialIds },
        isActive: true,
      }).lean()
      : [];

    const materialMap = new Map(
      materials.map((m: any) => [m._id.toString(), m])
    );

    const processedItems = items.map((item: any, index: number) => {
      const itemNumber = ((index + 1) * 10).toString(); // SAP style

      let materialData = null;
      let isMaterialCatalog = false;

      if (item.materialId) {
        materialData = materialMap.get(item.materialId);

        if (!materialData) {
          throw new ApiError(
            400,
            `Invalid material at item ${index + 1}`,
            "INVALID_MATERIAL"
          );
        }

        isMaterialCatalog = true;
      } else {
        if (!item.description || !item.quantity || !item.unitOfMeasure) {
          throw new ApiError(
            400,
            `Manual item requires description, quantity, unitOfMeasure (item ${index + 1})`,
            "VALIDATION_ERROR"
          );
        }
      }

      return {
        itemNumber,
        isMaterialCatalog,

        material: materialData?.materialCode || item.material || null,
        materialId: materialData?._id || null,

        description: materialData?.description || item.description,

        quantity: item.quantity,
        unitOfMeasure: materialData?.unitOfMeasure || item.unitOfMeasure,

        estimatedPrice:
          materialData?.price ?? item.estimatedPrice ?? 0,
        requiredDate: new Date(item.requiredDate) || new Date(requiredDate),

        plant: item.plant,
        storageLocation: item.storageLocation,

        status: "OPEN",
        orderedQuantity: 0,
      };
    });

    const totalEstimatedAmount = processedItems.reduce(
      (sum: number, item: any) =>
        sum + (item.estimatedPrice || 0) * item.quantity,
      0
    );

    const requisitionNumber = await generateRequisitionNumber(
      req.tenantConnection
    );

    const requisition = await Requisition.create({
      requisitionNumber,
      requester: user.userId,
      department,
      requiredDate,
      currency,

      items: processedItems,

      source,
      externalId,

      createdBy: user.userId,
      totalEstimatedAmount,
      skipApproval,

      status: "DRAFT",
      approvalStatus: "PENDING",
      currentApprovalLevel: 0,
      approvalFlow: [],
      procurementType,
      idempotencyKey
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Requisition created successfully",
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const { user, body } = req as any;
    const { requisitionId } = req.params;

    const Requisition = req.tenantConnection.model("Requisition");
    const Material = req.tenantConnection.model("Material");

    const existingRequisition = await Requisition.findById(requisitionId);

    if (!existingRequisition) {
      throw new ApiError(404, "Requisition not found", "NOT_FOUND");
    }

    if (existingRequisition.status !== "DRAFT") {
      throw new ApiError(
        400,
        "Only DRAFT requisitions can be updated",
        "INVALID_OPERATION"
      );
    }

    const {
      department,
      requiredDate,
      currency,
      items,
      source,
      externalId,
      skipApproval,
      procurementType
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items are required", "VALIDATION_ERROR");
    }

    if (externalId) {
      const existing = await Requisition.findOne({
        externalId,
        _id: { $ne: requisitionId },
      });

      if (existing) {
        throw new ApiError(
          400,
          "Duplicate externalId",
          "DUPLICATE_REQUEST"
        );
      }
    }

    const materialIds = items
      .filter((i: any) => i.materialId)
      .map((i: any) => new Types.ObjectId(i.materialId));

    const materials = materialIds.length
      ? await Material.find({
        _id: { $in: materialIds },
        isActive: true,
      }).lean()
      : [];

    const materialMap = new Map(
      materials.map((m: any) => [m._id.toString(), m])
    );

    const incomingMap = new Map(
      items
        .filter((i: any) => i._id)
        .map((i: any) => [i._id.toString(), i])
    );

    const updatedItems = existingRequisition.items.map((dbItem: any) => {
      const incoming = incomingMap.get(dbItem._id.toString());

      if (!incoming) return dbItem;

      const safeDate = incoming.requiredDate
        ? new Date(incoming.requiredDate)
        : dbItem.requiredDate;

      if (dbItem.isMaterialCatalog) {
        return {
          ...dbItem.toObject(),
          quantity: incoming.quantity ?? dbItem.quantity,
          requiredDate: safeDate,
          plant: incoming.plant ?? dbItem.plant,
          storageLocation: incoming.storageLocation ?? dbItem.storageLocation,
        };
      }

      if (!incoming.description || !incoming.quantity || !incoming.unitOfMeasure) {
        throw new ApiError(
          400,
          `Manual item requires description, quantity, unitOfMeasure (item ${dbItem.itemNumber})`,
          "VALIDATION_ERROR"
        );
      }

      return {
        ...dbItem.toObject(),
        description: incoming.description,
        quantity: incoming.quantity,
        unitOfMeasure: incoming.unitOfMeasure,
        estimatedPrice: incoming.estimatedPrice ?? dbItem.estimatedPrice,
        currency: incoming.currency ?? dbItem.currency ?? currency,
        requiredDate: safeDate,
        plant: incoming.plant ?? dbItem.plant,
        storageLocation: incoming.storageLocation ?? dbItem.storageLocation,
      };
    });

    const maxItemNumber =
      existingRequisition.items.length > 0
        ? Math.max(
          ...existingRequisition.items.map((i: any) =>
            Number(i.itemNumber)
          )
        )
        : 0;

    const newItems = items
      .filter((i: any) => !i._id)
      .map((item: any, index: number) => {
        const itemNumber = (maxItemNumber + (index + 1) * 10).toString();

        let materialData = null;
        let isMaterialCatalog = false;

        if (item.materialId) {
          materialData = materialMap.get(item.materialId);

          if (!materialData) {
            throw new ApiError(
              400,
              `Invalid material at new item ${index + 1}`,
              "INVALID_MATERIAL"
            );
          }

          isMaterialCatalog = true;
        } else {
          if (!item.description || !item.quantity || !item.unitOfMeasure) {
            throw new ApiError(
              400,
              `Manual item requires description, quantity, unitOfMeasure (new item ${index + 1})`,
              "VALIDATION_ERROR"
            );
          }
        }

        return {
          itemNumber,
          isMaterialCatalog,

          material: materialData?.materialCode || item.material || null,
          materialId: materialData?._id || null,

          description: materialData?.description || item.description,

          quantity: item.quantity,
          unitOfMeasure: materialData?.unitOfMeasure || item.unitOfMeasure,

          estimatedPrice:
            materialData?.price ?? item.estimatedPrice ?? 0,

          currency: materialData?.currency || item.currency || currency,

          requiredDate: item.requiredDate
            ? new Date(item.requiredDate)
            : new Date(requiredDate),

          plant: item.plant,
          storageLocation: item.storageLocation,

          status: "OPEN",
          orderedQuantity: 0,
        };
      });

    const finalItems = [...updatedItems, ...newItems];

    const totalEstimatedAmount = finalItems.reduce(
      (sum: number, item: any) =>
        sum + (item.estimatedPrice ?? 0) * item.quantity,
      0
    );

    existingRequisition.department =
      department ?? existingRequisition.department;

    existingRequisition.requiredDate = requiredDate
      ? new Date(requiredDate)
      : existingRequisition.requiredDate;

    existingRequisition.currency =
      currency ?? existingRequisition.currency;

    existingRequisition.items = finalItems;

    existingRequisition.source = source ?? existingRequisition.source;
    existingRequisition.externalId =
      externalId ?? existingRequisition.externalId;

    existingRequisition.skipApproval = skipApproval
    existingRequisition.procurementType = procurementType
    existingRequisition.totalEstimatedAmount = totalEstimatedAmount;

    existingRequisition.updatedBy = user.userId;

    await existingRequisition.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Requisition updated successfully",
      data: existingRequisition,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pageNum = "1", pagePer = "10", search, status, department } = req.query;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Requisition = req.tenantConnection.model("Requisition");

    const query: any = {};

    if (status) query.status = status;
    if (department) query.department = department;

    if (search) {
      const searchRegex = new RegExp(search.toString(), "i");
      query.$or = [
        { requisitionNumber: searchRegex },
        { "items.material": searchRegex },
        { "items.description": searchRegex },
      ];
    }

    const page = parseInt(pageNum.toString(), 10);
    const limit = parseInt(pagePer.toString(), 10);
    const skip = (page - 1) * limit;

    const totalCount = await Requisition.countDocuments(query);

    const requisitions = await Requisition.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Requisitions fetched successfully",
      data: {
        total: totalCount,
        page,
        pagePer: limit,
        totalPages: Math.ceil(totalCount / limit),
        items: requisitions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
  } catch (error) {
    next(error);
  }
};

export const submitRequisition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requisitionId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Requisition = req.tenantConnection.model("Requisition");
    const TenantAmountLimit = req.tenantConnection.model("TenantAmountLimit");

    const requisition = await Requisition.findById(requisitionId);

    if (!requisition) {
      throw new ApiError(404, "Requisition not found");
    }

    if (requisition.status !== "DRAFT") {
      throw new ApiError(400, "Only draft can be submitted");
    }

    if (!requisition.totalEstimatedAmount || requisition.totalEstimatedAmount <= 0) {
      throw new ApiError(400, "Invalid requisition amount");
    }

    //SKIP APPROVAL FLOW
    if (requisition.skipApproval) {
      requisition.status = "APPROVED";
      requisition.approvalStatus = "APPROVED";
      requisition.approvedAt = new Date();

      await requisition.save();

      return sendResponse({
        res,
        statusCode: 200,
        message: "Requisition auto-approved (skipApproval enabled)",
        data: requisition,
      });
    }

    const amount = requisition?.totalEstimatedAmount||0;

    const limits = await TenantAmountLimit.find({
      // minAmount: { $lte: Number(amount) },
      maxAmount: { $gte: Number(amount) },
      isActive: true,
    }).sort({ level: 1, });

    if (!limits.length) {
      throw new ApiError(400, "No approval policy found");
    }

    const levelMap = new Map<number, any>();

    for (const l of limits) {
      const level = l.level;

      if (!levelMap.has(level)) {
        levelMap.set(level, {
          level,
          roleIds: [],
          approvalsRequired: l.approvalsRequired || 1,
          approvedBy: [],
          status: "IN_PROGRESS",
        });
      }

      const levelObj = levelMap.get(level);

      if (!levelObj.roleIds.some((id: any) => id.toString() === l.roleId.toString())) {
        levelObj.roleIds.push(l.roleId);
      }

      levelObj.approvalsRequired = Math.max(
        levelObj.approvalsRequired,
        l.approvalsRequired || 1
      );
    }

    const approvalFlow = Array.from(levelMap.values()).sort(
      (a, b) => a.level - b.level
    );

    if (!approvalFlow.length) {
      throw new ApiError(400, "Approval flow could not be generated");
    }

    requisition.status = "SUBMITTED";
    requisition.approvalStatus = "IN_PROGRESS";
    requisition.currentApprovalLevel = approvalFlow[0].level;
    requisition.approvalFlow = approvalFlow;

    await requisition.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Requisition submitted for approval",
      data: requisition,
    });

  } catch (err) {
    next(err);
  }
};

export const approveRequisition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requisitionId } = req.params;
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Requisition = req.tenantConnection.model("Requisition");

    const requisition = await Requisition.findById(requisitionId);

    if (!requisition) {
      throw new ApiError(404, "Requisition not found");
    }

    if (requisition.approvalStatus !== "IN_PROGRESS") {
      throw new ApiError(400, "Not in approval stage");
    }

    const isAdmin = user?.role === "Admin";
    const now = new Date();

    if (isAdmin) {
      if (requisition.status === "APPROVED") {
        throw new ApiError(400, "Requisition already approved");
      }

      requisition.status = "APPROVED";
      requisition.approvalStatus = "APPROVED";
      requisition.approvedBy = user.userId;
      requisition.approvedAt = now;

      requisition.approvalFlow.forEach((step: any) => {
        if (step.status !== "APPROVED") {
          step.status = "APPROVED";
          step.approvedAt = now;
          step.approvedBy = [user.userId];
        }
      });

      await requisition.save();

      return sendResponse({
        res,
        statusCode: 200,
        message: "Approved by admin",
        data: requisition,
      });
    }

    const currentStep = requisition.approvalFlow.find(
      (s: any) => s.level === requisition.currentApprovalLevel
    );

    if (!currentStep) {
      throw new ApiError(400, "Invalid approval step");
    }

    const alreadyApprovedCurrent = currentStep.approvedBy.some(
      (id: any) => id.toString() === user?.userId.toString()
    );

    if (alreadyApprovedCurrent) {
      throw new ApiError(400, "Already approved this level");
    }

    const alreadyApproved = requisition.approvalFlow.some((step: any) =>
      step.approvedBy.some(
        (id: any) => id.toString() === user?.userId.toString()
      )
    );

    const isAuthorized = currentStep.roleIds.some(
      (r: any) => r.toString() === user?.roleId.toString()
    );

    if (!isAuthorized && !isAdmin) {
      if (alreadyApproved) {
        throw new ApiError(400, "You already approved in another level");
      }
      throw new ApiError(403, "Not authorized");
    }

    currentStep.approvedBy.push(user?.userId);
    
    if (!currentStep.status || currentStep.status !== "APPROVED") {
      currentStep.status = "APPROVED";
      currentStep.approvedAt = new Date();

      const currentIndex = requisition.approvalFlow.findIndex(
        (s: any) => s.level === currentStep.level
      );

      const nextStep = requisition.approvalFlow[currentIndex + 1];

      if (nextStep) {
        requisition.currentApprovalLevel = nextStep.level;
      } else {
        requisition.status = "APPROVED";
        requisition.approvalStatus = "APPROVED";
        requisition.approvedBy = user?.userId;
        requisition.approvedAt = new Date();
      }
    }

    await requisition.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Approved successfully",
      data: requisition,
    });
  } catch (err) {
    next(err);
  }
};

export const rejectRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { requisitionId } = req.params;
    const { reason } = req.body;
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const Requisition = req.tenantConnection.model("Requisition");

    const requisition = await Requisition.findById(requisitionId);

    if (!requisition) {
      throw new ApiError(404, "Requisition not found");
    }

    if (!["SUBMITTED", "IN_PROGRESS"].includes(requisition.status)) {
      throw new ApiError(400, `Cannot reject ${requisition.status} requisition`);
    }

    if (requisition.approvalStatus !== "IN_PROGRESS") {
      throw new ApiError(400, "Not in approval stage");
    }

    const isAdmin = user?.role === "Admin";
    const now = new Date();

    if (isAdmin) {
      requisition.status = "REJECTED";
      requisition.approvalStatus = "REJECTED";
      requisition.rejectionReason = reason;
      requisition.rejectedBy = user.userId;
      requisition.approvedAt = undefined;

      requisition.approvalFlow.forEach((step: any) => {
        if (step.status !== "REJECTED") {
          step.status = "REJECTED";
          step.rejectedBy = user.userId;
          step.rejectedAt = now;
          step.rejectionReason = reason;
        }
      });

      await requisition.save();

      return sendResponse({
        res,
        statusCode: 200,
        message: "Rejected by admin",
        data: requisition,
      });
    }

    const step = requisition.approvalFlow.find((s: any) =>
      s.roleIds.some(
        (r: any) => r.toString() === user?.roleId.toString()
      )
    );

    if (!step) {
      throw new ApiError(403, "Not authorized to reject");
    }

    if (step.status === "REJECTED") {
      throw new ApiError(400, "Already rejected this level");
    }

    step.status = "REJECTED";
    step.rejectedBy = user?.userId;
    step.rejectedAt = now;
    step.rejectionReason = reason;

    requisition.status = "REJECTED";
    requisition.approvalStatus = "REJECTED";
    requisition.rejectionReason = reason;
    requisition.rejectedBy = user?.userId;

    await requisition.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Requisition rejected successfully",
      data: requisition,
    });
  } catch (err) {
    next(err);
  }
};