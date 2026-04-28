import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { IPurchaseOrder } from "../../models/tenant/purchaseOrderModel";
import { generateInvoiceCode } from "../../utils/codeGenerator";

/**
 * -------------------------------------------------------------------
 * CREATE INVOICE
 * Validates:
 * 1. Tenant connection exists
 * 2. Purchase Order exists
 * 3. GRN exists (optional but recommended)
 * 4. Vendor matches PO
 * 5. Invoice qty <= GRN received qty
 * 6. Prevent over invoicing using previous invoices
 * 7. Uses Mongo transaction
 * -------------------------------------------------------------------
 */

export const createInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const user = req.user as any;

    const {
      purchaseOrderId,
      goodsReceiptIds = [],
      vendorInvoiceNumber,
      invoiceDate,
      postingDate,
      dueDate,
      remarks,
      paymentTerms,
      attachments = [],
      items,
    } = req.body;

    if (!purchaseOrderId) {
      throw new ApiError(400, "Purchase Order ID is required");
    }

    if (!vendorInvoiceNumber) {
      throw new ApiError(400, "Vendor invoice number is required");
    }

    if (!dueDate) {
      throw new ApiError(400, "Due date is required");
    }

    if (!Array.isArray(items) || !items.length) {
      throw new ApiError(400, "Invoice items are required");
    }

    const PurchaseOrder = req.tenantConnection.model("PurchaseOrder");

    const GoodsReceipt = req.tenantConnection.model("GoodsReceipt");

    const Invoice = req.tenantConnection.model("Invoice");

    const AuditLog = req.tenantConnection.model("AuditLog");

    const po:any = await PurchaseOrder.findById(purchaseOrderId)
      .session(session)
      .lean();

    if (!po) {
      throw new ApiError(404, "Purchase Order not found");
    }

    const duplicate = await Invoice.findOne({
      tenantId: po.tenantId,
      vendorId: po.vendorId,
      vendorInvoiceNumber: vendorInvoiceNumber.trim().toUpperCase(),
      status: {
        $ne: "REJECTED",
      },
    }).session(session);

    if (duplicate) {
      throw new ApiError(400, "Vendor invoice number already exists");
    }

    const grns: any[] = [];

    if (Array.isArray(goodsReceiptIds) && goodsReceiptIds.length) {
      const docs = await GoodsReceipt.find({
        _id: {
          $in: goodsReceiptIds,
        },
        purchaseOrderId: po._id,
      })
        .session(session)
        .lean();

      if (docs.length !== goodsReceiptIds.length) {
        throw new ApiError(400, "Invalid GRN selected");
      }

      grns.push(...docs);
    }

    const previousInvoices: any[] = await Invoice.find({
      purchaseOrderId: po._id,
      status: {
        $nin: ["REJECTED", "CANCELLED"],
      },
    })
      .session(session)
      .lean();

    const alreadyInvoicedMap = new Map<string, number>();

    for (const inv of previousInvoices) {
      for (const item of inv.items || []) {
        const key = String(item.purchaseOrderItemId);

        alreadyInvoicedMap.set(
          key,
          (alreadyInvoicedMap.get(key) || 0) +
            Number(item.invoicedQuantity || 0),
        );
      }
    }

    const receivedMap = new Map<string, number>();

    if (grns.length) {
      for (const grn of grns) {
        for (const item of grn.items || []) {
          const key = String(item.purchaseOrderItemId);

          receivedMap.set(
            key,
            (receivedMap.get(key) || 0) + Number(item.acceptedQuantity || 0),
          );
        }
      }
    }

    const finalItems: any[] = [];

    let anyMismatch = false;

    for (const reqItem of items) {
      const poItem = po.items.find(
        (x: any) =>
          String(x._id) === String(reqItem.purchaseOrderItemId) ||
          String(x.itemNumber) === String(reqItem.itemNumber),
      );

      if (!poItem) {
        throw new ApiError(400, "PO item not found");
      }

      const poItemId = String(poItem._id);

      const orderedQuantity = Number(poItem.quantity || 0);

      const receivedQuantity =
        grns.length > 0
          ? Number(receivedMap.get(poItemId) || 0)
          : Number(poItem.receivedQuantity || 0);

      const previouslyInvoicedQuantity = Number(
        alreadyInvoicedMap.get(poItemId) || 0,
      );

      const invoicedQuantity = Number(reqItem.invoicedQuantity || 0);

      const pendingInvoiceQuantity =
        receivedQuantity - previouslyInvoicedQuantity - invoicedQuantity;

      if (invoicedQuantity <= 0) {
        throw new ApiError(
          400,
          `Invalid invoice quantity for item ${poItem.itemNumber}`,
        );
      }

      if (invoicedQuantity > receivedQuantity - previouslyInvoicedQuantity) {
        throw new ApiError(
          400,
          `Over invoicing not allowed for item ${poItem.itemNumber}`,
        );
      }

      const poPrice = Number(poItem.netPrice || 0);

      const invoicePrice = Number(reqItem.invoiceUnitPrice ?? poPrice);

      const taxRate = Number(reqItem.taxRate || 0);

      let matchStatus = "MATCHED";

      const reasons: string[] = [];

      if (invoicePrice !== poPrice) {
        reasons.push("Price mismatch");
      }

      if (invoicedQuantity > receivedQuantity) {
        reasons.push("Quantity mismatch");
      }

      if (reasons.length) {
        anyMismatch = true;
        matchStatus =
          reasons.length > 1
            ? "MULTIPLE_MISMATCH"
            : reasons[0] === "Price mismatch"
              ? "PRICE_MISMATCH"
              : "QUANTITY_MISMATCH";
      }

      finalItems.push({
        purchaseOrderItemId: poItem._id,

        itemNumber: poItem.itemNumber,

        material: poItem.material || null,

        description: poItem.description || null,

        orderedQuantity,
        receivedQuantity,
        previouslyInvoicedQuantity,
        invoicedQuantity,
        pendingInvoiceQuantity,

        unitOfMeasure: poItem.unitOfMeasure,

        purchaseOrderUnitPrice: poPrice,

        invoiceUnitPrice: invoicePrice,

        taxRate,

        matchStatus,

        mismatchReason: reasons.join(", ") || null,

        remarks: reqItem.remarks || null,

        rfqId: poItem.rfqId || null,

        rfqItemId: poItem.rfqItemId || null,

        quotationId: poItem.quotationId || null,

        requisitionId: poItem.requisitionId || null,

        contractId: poItem.contractId || null,

        externalId: poItem.externalId || null,
      });
    }

    /* ---------------------------------------------------------- */
    /* GENERATE INTERNAL NUMBER                                   */
    /* ---------------------------------------------------------- */

    const invoiceNumber = await generateInvoiceCode(req.tenantConnection);

    /* ---------------------------------------------------------- */
    /* HEADER MATCH STATUS                                        */
    /* ---------------------------------------------------------- */

    const matchStatus = anyMismatch ? "MULTIPLE_MISMATCH" : "MATCHED";

    const status = anyMismatch ? "PENDING_MATCH" : "MATCHED";

    /* ---------------------------------------------------------- */
    /* CREATE INVOICE                                             */
    /* ---------------------------------------------------------- */

    const invoice = await Invoice.create(
      [
        {
          tenantId: po.tenantId,

          // vendorInvoiceNumber: vendorInvoiceNumber.trim().toUpperCase(),

          invoiceNumber,

          purchaseOrderId: po._id,

          purchaseOrderNumber: po.purchaseOrderNumber,

          goodsReceiptIds: goodsReceiptIds,

          vendorId: po.vendorId,

          supplierName: po.supplierName,

          companyCode: po.companyCode,

          purchasingOrganization: po.purchasingOrganization,

          purchasingGroup: po.purchasingGroup,

          items: finalItems,

          currency: po.currency,

          exchangeRate: po.exchangeRate || 1,

          invoiceDate: invoiceDate || new Date(),

          postingDate: postingDate || new Date(),

          dueDate,

          paymentTerms: paymentTerms || po.paymentTerms,

          remarks: remarks || null,

          attachments,

          status,
          matchStatus,

          source: "MANUAL",

          syncStatus: "PENDING",

          createdBy: user?._id,
        },
      ],
      { session },
    );

    /* ---------------------------------------------------------- */
    /* AUDIT                                                      */
    /* ---------------------------------------------------------- */

    await AuditLog.create(
      [
        {
          tenantId: po.tenantId,
          module: "INVOICE",
          documentId: invoice[0]._id,
          action: "CREATE",
          performedBy: user?._id,
          remarks: `Invoice ${invoiceNumber} created`,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return sendResponse({
      res,
      statusCode: 201,
      message: "Invoice created successfully",
      data: invoice[0],
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
