import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { Types } from "mongoose";
import { generateGRNCode } from "../../utils/codeGenerator";
import { GoodsReceiptStatus } from "../../models/tenant/goodsRecieptModel";

//Need to add transactions
export const createGoodsReciept = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const user = req.user as any;

    const GoodsReceiptModel =
      req.tenantConnection.model("GoodsReceipt");

    const PurchaseOrderModel =
      req.tenantConnection.model("PurchaseOrder");

    const {
      purchaseOrderId,
      items,
      receivedDate,
      remarks,
    } = req.body;

    if (!purchaseOrderId) {
      throw new ApiError(400, "Purchase order is required");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(
        400,
        "At least one item is required"
      );
    }

    const po = await PurchaseOrderModel.findById(
      purchaseOrderId
    );

    if (!po) {
      throw new ApiError(
        404,
        "Purchase order not found"
      );
    }

    if (
      ["CANCELLED", "COMPLETED"].includes(
        po.status
      )
    ) {
      throw new ApiError(
        400,
        `Cannot create GRN for ${po.status} purchase order`
      );
    }

    const poItemsMap = new Map();

    for (const item of po.items) {
      poItemsMap.set(String(item._id), item);
      poItemsMap.set(String(item.itemNumber), item);
    }

    const grnItems: any[] = [];

    let totalReceivedQuantity = 0;
    let totalAcceptedQuantity = 0;
    let totalRejectedQuantity = 0;

    let allFullyReceived = true;
    let allRejected = true;

    for (const row of items) {
      const key =
        row.purchaseOrderItemId ||
        row.itemId ||
        row.itemNumber;

      const poItem = poItemsMap.get(String(key));

      if (!poItem) {
        throw new ApiError(
          400,
          `Invalid PO item selected`
        );
      }

      const orderedQuantity = Number(
        poItem.quantity || 0
      );

      const previouslyReceivedQuantity = Number(
        poItem.receivedQuantity || 0
      );

      const receivedQuantity = Number(
        row.receivedQuantity || 0
      );

      const acceptedQuantity = Number(
        row.acceptedQuantity || 0
      );

      const rejectedQuantity = Number(
        row.rejectedQuantity || 0
      );

      if (receivedQuantity < 0) {
        throw new ApiError(
          400,
          `Received quantity must be greater than 0`
        );
      }

      if (
        acceptedQuantity +
          rejectedQuantity !==
        receivedQuantity
      ) {
        throw new ApiError(
          400,
          `Accepted + Rejected must equal Received for item ${poItem.itemNumber}`
        );
      }

      const remainingQuantity =
        orderedQuantity -
        previouslyReceivedQuantity;

      if (
        receivedQuantity >
        remainingQuantity
      ) {
        throw new ApiError(
          400,
          `Received quantity exceeds pending quantity for item ${poItem.itemNumber}`
        );
      }

      const newReceivedQty =
        previouslyReceivedQuantity +
        acceptedQuantity;

      const pendingQuantity =
        orderedQuantity - newReceivedQty;

      let itemStatus:
        | "PARTIAL"
        | "FULL"
        | "REJECTED" = "PARTIAL";

      if (acceptedQuantity === 0) {
        itemStatus = "REJECTED";
      } else if (
        pendingQuantity === 0
      ) {
        itemStatus = "FULL";
      }

      if (pendingQuantity > 0) {
        allFullyReceived = false;
      }

      if (acceptedQuantity > 0) {
        allRejected = false;
      }

      poItem.receivedQuantity =
        newReceivedQty;

      if (newReceivedQty === 0) {
        poItem.status = "OPEN";
      } else if (
        newReceivedQty <
        orderedQuantity
      ) {
        poItem.status =
          "PARTIALLY_RECEIVED";
      } else {
        poItem.status = "RECEIVED";
      }

      grnItems.push({
        purchaseOrderItemId:
          poItem._id,

        itemNumber:
          poItem.itemNumber,

        material:
          poItem.material || null,

        description:
          poItem.description ||
          null,

        orderedQuantity,
        previouslyReceivedQuantity,
        receivedQuantity,
        acceptedQuantity,
        rejectedQuantity,
        pendingQuantity,

        unitOfMeasure:
          poItem.unitOfMeasure,

        plant:
          poItem.plant || null,

        storageLocation:
          poItem.storageLocation ||
          null,

        status: itemStatus,

        remarks:
          row.remarks || null,

        requisitionId:
          poItem.requisitionId ||
          null,

        rfqId:
          poItem.rfqId || null,

        rfqItemId:
          poItem.rfqItemId ||
          null,

        quotationId:
          poItem.quotationId ||
          null,

        contractId:
          poItem.contractId ||
          null,

        externalId:
          poItem.externalId ||
          null,
      });

      totalReceivedQuantity +=
        receivedQuantity;

      totalAcceptedQuantity +=
        acceptedQuantity;

      totalRejectedQuantity +=
        rejectedQuantity;
    }

    let grnStatus =
      GoodsReceiptStatus.PARTIAL;

    if (allRejected) {
      grnStatus =
        GoodsReceiptStatus.REJECTED;
    } else if (allFullyReceived) {
      grnStatus =
        GoodsReceiptStatus.FULL;
    }

    const grnNumber =
      await generateGRNCode(
        req.tenantConnection
      );

    const grn =
      await GoodsReceiptModel.create({
        tenantId: po.tenantId,
        grnNumber,

        purchaseOrderId: po._id,
        purchaseOrderNumber:
          po.purchaseOrderNumber,

        vendorId: po.vendorId,
        supplierName:
          po.supplierName,

        companyCode:
          po.companyCode,

        purchasingOrganization:
          po.purchasingOrganization,

        purchasingGroup:
          po.purchasingGroup,

        currency:
          po.currency,

        items: grnItems,

        totalReceivedQuantity,
        totalAcceptedQuantity,
        totalRejectedQuantity,

        receivedDate:
          receivedDate ||
          new Date(),

        status: grnStatus,

        source: "DIRECT",
        syncStatus: "PENDING",

        remarks:
          remarks || null,

        createdBy: user._id,
      });

    const hasOpenItems =
      po.items.some(
        (item: any) =>
          item.status !==
          "RECEIVED"
      );

    po.status = hasOpenItems
      ? "PARTIALLY_RECEIVED"
      : "RECEIVED";

    po.updatedBy = user._id;

    await po.save();

    sendResponse({
      res,
      statusCode: 201,
      message:
        "Goods receipt created successfully",
      data: grn,
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
