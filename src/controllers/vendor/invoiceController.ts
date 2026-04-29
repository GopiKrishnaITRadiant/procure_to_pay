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
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const user = req.user as any;

    const {
      purchaseOrderId,
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

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Invoice items are required");
    }

    const PurchaseOrder = req.tenantConnection.model("PurchaseOrder");

    const GoodsReceipt = req.tenantConnection.model("GoodsReceipt");

    const Invoice = req.tenantConnection.model("VendorInvoice");

    /* ---------------------------------------------------------- */
    /* LOAD PO                                                    */
    /* ---------------------------------------------------------- */

    const po: any = await PurchaseOrder.findById(purchaseOrderId).lean();

    if (!po) {
      throw new ApiError(404, "Purchase Order not found");
    }

    /* ---------------------------------------------------------- */
    /* DUPLICATE SUPPLIER INVOICE CHECK                           */
    /* ---------------------------------------------------------- */

    const normalizedVendorInvoiceNumber = vendorInvoiceNumber
      .trim()
      .toUpperCase();

    const duplicate = await Invoice.findOne({
      tenantId: po.tenantId,
      vendorId: po.vendorId,
      vendorInvoiceNumber: normalizedVendorInvoiceNumber,
      status: {
        $nin: ["REJECTED", "CANCELLED"],
      },
    });

    if (duplicate) {
      throw new ApiError(400, "Vendor invoice number already exists");
    }

    /* ---------------------------------------------------------- */
    /* AUTO FETCH APPROVED / RECEIVABLE GRNS                      */
    /* ---------------------------------------------------------- */

    const selectedGRNs: any[] = await GoodsReceipt.find({
      purchaseOrderId: po._id,
      vendorId: po.vendorId,
      status: {
        $in: ["PARTIAL", "FULL"],
      },
    }).lean();

    /* ---------------------------------------------------------- */
    /* PREVIOUS INVOICES                                          */
    /* ---------------------------------------------------------- */

    const previousInvoices: any[] = await Invoice.find({
      purchaseOrderId: po._id,
      status: {
        $nin: ["REJECTED", "CANCELLED"],
      },
    }).lean();

    const alreadyInvoicedMap = new Map<string, number>();

    for (const inv of previousInvoices) {
      for (const row of inv.items || []) {
        const key = String(row.purchaseOrderItemId);

        alreadyInvoicedMap.set(
          key,
          (alreadyInvoicedMap.get(key) || 0) +
            Number(row.invoicedQuantity || 0),
        );
      }
    }

    /* ---------------------------------------------------------- */
    /* RECEIVED QTY FROM GRNS                                     */
    /* ---------------------------------------------------------- */

    const receivedMap = new Map<string, number>();

    for (const grn of selectedGRNs) {
      for (const row of grn.items || []) {
        const key = String(row.purchaseOrderItemId);

        receivedMap.set(
          key,
          (receivedMap.get(key) || 0) + Number(row.acceptedQuantity || 0),
        );
      }
    }

    /* ---------------------------------------------------------- */
    /* VALIDATE ITEMS + CALCULATE                                 */
    /* ---------------------------------------------------------- */

    const finalItems: any[] = [];

    let subtotal = 0;
    let taxAmount = 0;
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

      const receivedQuantity = Number(receivedMap.get(poItemId) || 0);

      const previouslyInvoicedQuantity = Number(
        alreadyInvoicedMap.get(poItemId) || 0,
      );

      const availableQty = receivedQuantity - previouslyInvoicedQuantity;

      const invoicedQuantity = Number(reqItem.invoicedQuantity || 0);

      if (invoicedQuantity <= 0) {
        throw new ApiError(
          400,
          `Invalid invoice quantity for item ${poItem.itemNumber}`,
        );
      }

      if (invoicedQuantity > availableQty) {
        throw new ApiError(
          400,
          `Over invoicing not allowed for item ${poItem.itemNumber}`,
        );
      }

      const pendingInvoiceQuantity = availableQty - invoicedQuantity;

      const poPrice = Number(poItem.netPrice || 0);

      const invoiceUnitPrice = Number(reqItem.invoiceUnitPrice ?? poPrice);

      const taxRate = Number(reqItem.taxRate || 0);

      const lineSubTotal = invoicedQuantity * invoiceUnitPrice;

      const lineTaxAmount = (lineSubTotal * taxRate) / 100;

      const lineGrandTotal = lineSubTotal + lineTaxAmount;

      subtotal += lineSubTotal;

      taxAmount += lineTaxAmount;

      let matchStatus = "MATCHED";

      const reasons: string[] = [];

      if (invoiceUnitPrice !== poPrice) {
        reasons.push("Price mismatch");
      }

      if (invoicedQuantity > availableQty) {
        reasons.push("Quantity mismatch");
      }

      if (reasons.length) {
        anyMismatch = true;

        if (reasons.length > 1) {
          matchStatus = "MULTIPLE_MISMATCH";
        } else if (reasons[0] === "Price mismatch") {
          matchStatus = "PRICE_MISMATCH";
        } else {
          matchStatus = "QUANTITY_MISMATCH";
        }
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

        invoiceUnitPrice,

        lineSubTotal,

        taxRate,

        taxAmount: lineTaxAmount,

        lineGrandTotal,

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
    /* HEADER TOTALS                                              */
    /* ---------------------------------------------------------- */

    const grandTotal = subtotal + taxAmount;

    const dueAmount = grandTotal;

    const invoiceNumber = await generateInvoiceCode(req.tenantConnection);

    const headerMatchStatus = anyMismatch ? "MULTIPLE_MISMATCH" : "MATCHED";

    const status = anyMismatch ? "PENDING_MATCH" : "MATCHED";

    /* ---------------------------------------------------------- */
    /* SOURCE                                                     */
    /* ---------------------------------------------------------- */

    const source = user?.userType === "VENDOR" ? "PORTAL" : "MANUAL";

    /* ---------------------------------------------------------- */
    /* CREATE                                                     */
    /* ---------------------------------------------------------- */

    const invoice = await Invoice.create({
      tenantId: po.tenantId,

      vendorInvoiceNumber: normalizedVendorInvoiceNumber,

      invoiceNumber,

      purchaseOrderId: po._id,

      purchaseOrderNumber: po.purchaseOrderNumber,

      goodsReceiptIds: selectedGRNs.map((x: any) => x._id),

      vendorId: po.vendorId,

      supplierName: po.supplierName,

      companyCode: po.companyCode,

      purchasingOrganization: po.purchasingOrganization,

      purchasingGroup: po.purchasingGroup,

      items: finalItems,

      subtotal,
      taxAmount,
      grandTotal,

      paidAmount: 0,
      dueAmount,

      currency: po.currency,

      exchangeRate: po.exchangeRate || 1,

      invoiceDate: invoiceDate || new Date(),

      postingDate: postingDate || new Date(),

      dueDate,

      paymentTerms: paymentTerms || po.paymentTerms,

      remarks: remarks || null,

      attachments,

      status,

      matchStatus: headerMatchStatus,

      source,

      syncStatus: "PENDING",

      createdBy: user?._id,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { invoiceId:id } = req.params;

    if (!id) {
      throw new ApiError(400, "Invoice ID is required");
    }

    const user = req.user as any;

    const Invoice = req.tenantConnection.model("VendorInvoice");

    const invoice:any = await Invoice.findById(id)
      .populate("purchaseOrderId", "purchaseOrderNumber status")
      .populate("vendorId", "name code")
      .lean();

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    const isAdmin = user?.role === "ADMIN" || user?.userType === "ADMIN";

    const isSameTenant =
      invoice.tenantId?.toString() === req.user?.tenantId?.toString();

    if (!isSameTenant) {
      throw new ApiError(403, "Access denied");
    }

    if (!isAdmin) {
      delete (invoice as any).syncStatus;
      delete (invoice as any).createdBy;
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Invoice fetched successfully",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};
