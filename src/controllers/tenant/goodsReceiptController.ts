import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { Types } from "mongoose";
import { generateGRNCode } from "../../utils/codeGenerator";
import { GoodsReceiptStatus } from "../../models/tenant/goodsReceiptModel";
import mongoose from "mongoose";
/**
 * Creates GRN in CREATED status
 * No PO quantity update yet
 * Approval required later
 */

export const createGoodsReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // const session = await mongoose.startSession();

  try {
    // session.startTransaction();

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const user = req.user as any;

    const GoodsReceipt = req.tenantConnection.model("GoodsReceipt");
    const PurchaseOrder = req.tenantConnection.model("PurchaseOrder");
    // const AuditLog = req.tenantConnection.model("AuditLog");

    const { purchaseOrderId, items, receivedDate, remarks } = req.body;

    if (!purchaseOrderId) {
      throw new ApiError(400, "Purchase order required");
    }

    if (!Array.isArray(items) || !items.length) {
      throw new ApiError(400, "Items required");
    }

    const po: any =
      await PurchaseOrder.findById(purchaseOrderId)
      // .session(session);

    if (!po) {
      throw new ApiError(404, "Purchase order not found");
    }

    if (["CANCELLED", "COMPLETED"].includes(po.status)) {
      throw new ApiError(400, `Cannot create GRN for ${po.status}`);
    }

    const poMap = new Map();

    for (const item of po.items) {
      poMap.set(String(item._id), item);
      poMap.set(String(item.itemNumber), item);
    }

    const grnItems: any[] = [];

    let totalReceived = 0;
    let totalAccepted = 0;
    let totalRejected = 0;

    let allFull = true;
    let allRejected = true;

    for (const row of items) {
      const key = row.purchaseOrderItemId || row.itemId || row.itemNumber;

      const poItem = poMap.get(String(key));

      if (!poItem) {
        throw new ApiError(400, "Invalid PO item selected");
      }

      const ordered = Number(poItem.quantity || 0);

      const prevReceived = Number(poItem.receivedQuantity || 0);

      const received = Number(row.receivedQuantity || 0);

      const accepted = Number(row.acceptedQuantity || 0);

      const rejected = Number(row.rejectedQuantity || 0);

      if (received <= 0) {
        throw new ApiError(400, "Received qty must be > 0");
      }

      if (accepted + rejected !== received) {
        throw new ApiError(
          400,
          `Accepted + rejected mismatch item ${poItem.itemNumber}`,
        );
      }

      const remaining = ordered - prevReceived;

      if (received > remaining) {
        throw new ApiError(
          400,
          `Qty exceeds balance for item ${poItem.itemNumber}`,
        );
      }

      const pending = ordered - (prevReceived + accepted);

      let itemStatus: "PARTIAL" | "FULL" | "REJECTED" = "PARTIAL";

      if (accepted === 0) {
        itemStatus = "REJECTED";
      } else if (pending === 0) {
        itemStatus = "FULL";
      }

      if (pending > 0) {
        allFull = false;
      }

      if (accepted > 0) {
        allRejected = false;
      }

      grnItems.push({
        purchaseOrderItemId: poItem._id,
        itemNumber: poItem.itemNumber,
        material: poItem.material || null,
        description: poItem.description || null,

        orderedQuantity: ordered,
        previouslyReceivedQuantity: prevReceived,
        receivedQuantity: received,
        acceptedQuantity: accepted,
        rejectedQuantity: rejected,
        pendingQuantity: pending,

        unitOfMeasure: poItem.unitOfMeasure,

        plant: poItem.plant || null,
        storageLocation: poItem.storageLocation || null,

        status: itemStatus,

        remarks: row.remarks || null,

        requisitionId: poItem.requisitionId || null,

        rfqId: poItem.rfqId || null,
        quotationId: poItem.quotationId || null,
        contractId: poItem.contractId || null,

        externalId: poItem.externalId || null,
      });

      totalReceived += received;
      totalAccepted += accepted;
      totalRejected += rejected;
    }

    let grnStatus = GoodsReceiptStatus.PARTIAL;

    if (allRejected) {
      grnStatus = GoodsReceiptStatus.REJECTED;
    } else if (allFull) {
      grnStatus = GoodsReceiptStatus.FULL;
    }

    const grnNumber = await generateGRNCode(req.tenantConnection);

    const grn = await GoodsReceipt.create(
      [
        {
          tenantId: po.tenantId,
          grnNumber,

          purchaseOrderId: po._id,
          purchaseOrderNumber: po.purchaseOrderNumber,

          vendorId: po.vendorId,
          supplierName: po.supplierName,

          companyCode: po.companyCode,

          purchasingOrganization: po.purchasingOrganization,

          purchasingGroup: po.purchasingGroup,

          currency: po.currency,

          items: grnItems,

          totalReceivedQuantity: totalReceived,

          totalAcceptedQuantity: totalAccepted,

          totalRejectedQuantity: totalRejected,

          receivedDate: receivedDate || new Date(),

          status: GoodsReceiptStatus.CREATED,

          remarks: remarks || null,

          createdBy: user._id,
        },
      ],
      // { session },
    );

    // await AuditLog.create(
    //   [
    //     {
    //       module: "GOODS_RECEIPT",
    //       documentId: grn[0]._id,
    //       action: "CREATE",
    //       performedBy: user._id,
    //       remarks: `GRN ${grnNumber} created`,
    //     },
    //   ],
    //   { session },
    // );

    // await session.commitTransaction();

    return sendResponse({
      res,
      statusCode: 201,
      message: "Goods receipt created successfully",
      data: grn[0],
    });
  } catch (error) {
    // await session.abortTransaction();
    next(error);
  } finally {
    // session.endSession();
  }
};

export const approveGoodsReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // const session = await mongoose.startSession();

  try {
    // session.startTransaction();

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const user = req.user as any;

    const GoodsReceipt = req.tenantConnection.model("GoodsReceipt");

    const PurchaseOrder = req.tenantConnection.model("PurchaseOrder");

    // const AuditLog = req.tenantConnection.model("AuditLog");

    const { goodsReceiptId:id } = req.params;

    const grn: any = await GoodsReceipt.findById(id)
    // .session(session);

    if (!grn) {
      throw new ApiError(404, "GRN not found");
    }

    if (grn.status === GoodsReceiptStatus.CANCELLED) {
      throw new ApiError(400, "Cancelled GRN cannot approve");
    }

    const po: any = await PurchaseOrder.findById(grn.purchaseOrderId)
    // .session(
    //   session,
    // );

    if (!po) {
      throw new ApiError(404, "PO not found");
    }

    for (const row of grn.items) {
      const poItem = po.items.id(row.purchaseOrderItemId);

      if (!poItem) continue;

      const prev = Number(poItem.receivedQuantity || 0);

      const newQty = prev + Number(row.acceptedQuantity || 0);

      poItem.receivedQuantity = newQty;

      if (newQty === 0) {
        poItem.status = "OPEN";
      } else if (newQty < Number(poItem.quantity || 0)) {
        poItem.status = "PARTIALLY_RECEIVED";
      } else {
        poItem.status = "RECEIVED";
      }
    }

    const openItems = po.items.some((x: any) => x.status !== "RECEIVED");

    po.status = openItems ? "PARTIALLY_RECEIVED" : "RECEIVED";

    po.updatedBy = user._id;

    await po.save({
      // session,
    });

    let finalStatus = GoodsReceiptStatus.PARTIAL;

    if (grn.totalAcceptedQuantity === 0) {
      finalStatus = GoodsReceiptStatus.REJECTED;
    } else if (grn.items.every((x: any) => x.status === "FULL")) {
      finalStatus = GoodsReceiptStatus.FULL;
    }

    grn.status = finalStatus;
    grn.updatedBy = user._id;

    await grn.save({
      // session,
    });

    // await AuditLog.create(
    //   [
    //     {
    //       module: "GOODS_RECEIPT",
    //       documentId: grn._id,
    //       action: "APPROVE",
    //       performedBy: user._id,
    //       remarks: `GRN ${grn.grnNumber} approved`,
    //     },
    //   ],
    //   { session },
    // );

    // await session.commitTransaction();

    return sendResponse({
      res,
      statusCode: 200,
      message: "GRN approved successfully",
      data: grn,
    });
  } catch (error) {
    // await session.abortTransaction();
    next(error);
  } finally {
    // session.endSession();
  }
};

export const rejectGoodsReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const user = req.user as any;

    const GoodsReceipt = req.tenantConnection.model("GoodsReceipt");

    // const AuditLog = req.tenantConnection.model("AuditLog");

    const { goodsReceiptId:id } = req.params;
    const { remarks } = req.body;

    const grn: any = await GoodsReceipt.findById(id);

    if (!grn) {
      throw new ApiError(404, "GRN not found");
    }

    grn.status = GoodsReceiptStatus.REJECTED;

    grn.remarks = remarks || grn.remarks;

    grn.updatedBy = user._id;

    await grn.save();

    // await AuditLog.create({
    //   module: "GOODS_RECEIPT",
    //   documentId: grn._id,
    //   action: "REJECT",
    //   performedBy: user._id,
    //   remarks: remarks || `GRN rejected`,
    // });

    return sendResponse({
      res,
      statusCode: 200,
      message: "GRN rejected successfully",
      data: grn,
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                             GET BY ID                                      */
/* -------------------------------------------------------------------------- */

export const getGoodsReceiptById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const GoodsReceipt = req.tenantConnection.model("GoodsReceipt");

    const { id } = req.params;

    const data = await GoodsReceipt.findById(id)
      .populate("vendorId", "name email")
      .populate("createdBy", "name email");

    if (!data) {
      throw new ApiError(404, "GRN not found");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Goods receipt fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

//SEND GOODS RECEIPT MAIL
export const sendGoodsReciept = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { id } = req.params;

    const GoodsReceiptModel = req.tenantConnection.model("GoodsReceipt");

    const VendorModel = req.tenantConnection.model("Vendor");

    const grn = await GoodsReceiptModel.findById(id).lean();

    if (!grn) {
      throw new ApiError(404, "GRN not found");
    }

    // const vendor =
    //   await VendorModel.findById(
    //     grn.vendorId
    //   ).lean();

    // if (!vendor?.email) {
    //   throw new ApiError(
    //     400,
    //     "Vendor email not found"
    //   );
    // }

    // await sendMailQueue.add("send-mail", {
    //   to: vendor.email,
    //   subject: `Goods Receipt ${grn.grnNumber}`,
    //   template: "goods-receipt",
    //   data: {
    //     vendorName: vendor.name,
    //     grnNumber: grn.grnNumber,
    //     poNumber: grn.poNumber,
    //     receivedDate: grn.receivedDate,
    //   },
    // });

    sendResponse({
      res,
      statusCode: 200,
      message: "Goods receipt sent successfully",
      data: grn,
    });
  } catch (error) {
    next(error);
  }
};

export const getGoodsRecieptById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { id } = req.params;

    if (!Types.ObjectId.isValid(id as string)) {
      throw new ApiError(400, "Invalid id");
    }

    const GoodsReceiptModel = req.tenantConnection.model("GoodsReceipt");

    const grn = await GoodsReceiptModel.findById(id)
      .populate("purchaseOrderId", "purchaseOrderNumber status")
      .populate("vendorId", "name email phone")
      .populate("createdBy", "name email")
      .lean();

    if (!grn) {
      throw new ApiError(404, "GRN not found");
    }

    sendResponse({
      res,
      statusCode: 200,
      message: "GRN found successfully",
      data: grn,
    });
  } catch (error) {
    next(error);
  }
};
