import { Request, Response, NextFunction } from "express";
import mongoose, { connection } from "mongoose";
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
  // const session = await req.tenantConnection?.startSession();
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

    if (!purchaseOrderId)
      throw new ApiError(400, "Purchase Order ID is required");
    if (!vendorInvoiceNumber)
      throw new ApiError(400, "Vendor invoice number is required");
    if (!dueDate) throw new ApiError(400, "Due date is required");
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Invoice items are required");
    }

    const PurchaseOrder = req.tenantConnection.model("PurchaseOrder");
    const GoodsReceipt = req.tenantConnection.model("GoodsReceipt");
    const Invoice = req.tenantConnection.model("VendorInvoice");
    // const AuditLog = req.tenantConnection.model("AuditLog");
    // session.startTransaction();

    const po: any = await PurchaseOrder.findById(purchaseOrderId)
      // .session(session)
      .lean();

    if (!po) throw new ApiError(404, "Purchase Order not found");

    if (user?.userType === "VENDOR") {
      if (String(user.vendorId) !== String(po.vendorId)) {
        throw new ApiError(403, "Vendor not authorized for this PO");
      }
    }

    //DUPLICATE INVOICE CHECK
    const normalizedVendorInvoiceNumber = vendorInvoiceNumber
      .trim()
      .toUpperCase();

    const duplicate = await Invoice.findOne({
      tenantId: po.tenantId,
      vendorId: po.vendorId,
      vendorInvoiceNumber: normalizedVendorInvoiceNumber,
      status: { $nin: ["REJECTED", "CANCELLED"] },
    })
    // .session(session);

    if (duplicate) {
      throw new ApiError(400, "Vendor invoice number already exists");
    }

    //Find GRNs for this PO
    const selectedGRNs: any[] = await GoodsReceipt.find({
      purchaseOrderId: po._id,
      vendorId: po.vendorId,
      status: { $in: ["PARTIAL", "FULL", "APPROVED"] },
    })
      // .session(session)
      .lean();

    const previousInvoices: any[] = await Invoice.find({
      purchaseOrderId: po._id,
      status: { $nin: ["REJECTED", "CANCELLED"] },
    })
      // .session(session)
      .lean();

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

    //RECEIVED QTY FROM GRN
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

    //VALIDATION + CALCULATION
    const round = (n: number) => Math.round(n * 100) / 100;
    const PRICE_TOLERANCE = 0.01;

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

      if (!poItem) throw new ApiError(400, "PO item not found");

      const poItemId = String(poItem._id);

      const orderedQty = Number(poItem.quantity || 0);
      const receivedQty = Number(receivedMap.get(poItemId) || 0);
      const prevInvoicedQty = Number(alreadyInvoicedMap.get(poItemId) || 0);

      const availableQty = receivedQty - prevInvoicedQty;

      const invoicedQty = Number(reqItem.invoicedQuantity || 0);

      if (invoicedQty <= 0) {
        throw new ApiError(
          400,
          `Invalid quantity for item ${poItem.itemNumber}`,
        );
      }

      if (invoicedQty > availableQty) {
        throw new ApiError(
          400,
          `Over invoicing not allowed for item ${poItem.itemNumber}`,
        );
      }

      const poPrice = Number(poItem.netPrice || 0);
      const invoicePrice = Number(reqItem.invoiceUnitPrice ?? poPrice);

      const taxRate = Number(reqItem.taxRate || 0);

      const lineSubTotal = round(invoicedQty * invoicePrice);
      const lineTax = round((lineSubTotal * taxRate) / 100);
      const lineTotal = round(lineSubTotal + lineTax);

      subtotal = round(subtotal + lineSubTotal);
      taxAmount = round(taxAmount + lineTax);

      //MATCH LOGIC 
      let matchStatus = "MATCHED";
      const reasons: string[] = [];

      if (Math.abs(invoicePrice - poPrice) > PRICE_TOLERANCE) {
        reasons.push("Price mismatch");
      }

      if (reasons.length) {
        anyMismatch = true;
        matchStatus =
          reasons.length > 1 ? "MULTIPLE_MISMATCH" : "PRICE_MISMATCH";
      }

      finalItems.push({
        purchaseOrderItemId: poItem._id,
        itemNumber: poItem.itemNumber,

        description: poItem.description,

        orderedQuantity: orderedQty,
        receivedQuantity: receivedQty,
        previouslyInvoicedQuantity: prevInvoicedQty,

        invoicedQuantity: invoicedQty,
        pendingInvoiceQuantity: availableQty - invoicedQty,

        unitOfMeasure: poItem.unitOfMeasure,

        purchaseOrderUnitPrice: poPrice,
        invoiceUnitPrice: invoicePrice,

        lineSubTotal,
        taxRate,
        taxAmount: lineTax,
        lineGrandTotal: lineTotal,

        matchStatus,
        mismatchReason: reasons.join(", ") || null,

        rfqId: poItem.rfqId || null,
        rfqItemId: poItem.rfqItemId || null,
        quotationId: poItem.quotationId || null,
      });
    }

    //TOTALS
    const grandTotal = round(subtotal + taxAmount);

    const invoiceNumber = await generateInvoiceCode(req.tenantConnection);

    const headerMatchStatus = anyMismatch ? "MULTIPLE_MISMATCH" : "MATCHED";

    const status = anyMismatch ? "PENDING_MATCH" : "MATCHED";

    const source = user?.userType === "VENDOR" ? "PORTAL" : "MANUAL";

    //CREATE INVOICE
    const invoice = await Invoice.create(
      [
        {
          tenantId: po.tenantId,
          vendorInvoiceNumber: normalizedVendorInvoiceNumber,
          invoiceNumber,

          purchaseOrderId: po._id,
          purchaseOrderNumber: po.purchaseOrderNumber,

          goodsReceiptIds: selectedGRNs.map((g) => g._id),

          vendorId: po.vendorId,
          supplierName: po.supplierName,

          items: finalItems,

          subtotal,
          taxAmount,
          grandTotal,

          paidAmount: 0,
          dueAmount: grandTotal,

          currency: po.currency,
          exchangeRate: po.exchangeRate || 1,

          invoiceDate: invoiceDate || new Date(),
          postingDate: postingDate || new Date(),
          dueDate,

          paymentTerms: paymentTerms || po.paymentTerms,

          remarks,
          attachments,

          status,
          matchStatus: headerMatchStatus,

          source,
          syncStatus: "PENDING",

          createdBy: user?._id,
        },
      ],
      // { session },
    );

    // await session.commitTransaction();
    // session.endSession();

    return sendResponse({
      res,
      statusCode: 201,
      message: "Invoice created successfully",
      data: invoice[0],
    });
  } catch (error) {
    //   await session.abortTransaction();
    //   session.endSession();
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

    const { invoiceId: id } = req.params;

    if (!id) {
      throw new ApiError(400, "Invoice ID is required");
    }

    const user = req.user as any;

    const Invoice = req.tenantConnection.model("VendorInvoice");

    const invoice: any = await Invoice.findById(id)
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

export const invoiceAndGoodsAndPurchaseOrderMatch = async (
  connection: any,
  invoiceId: any,
) => {
  const Invoice = connection.model("VendorInvoice");
  const GoodsReceipt = connection.model("GoodsReceipt");
  const PurchaseOrder = connection.model("PurchaseOrder");

  const invoice: any = await Invoice.findById(invoiceId).lean();

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const po: any = await PurchaseOrder.findById(invoice.purchaseOrderId).lean();

  if (!po) {
    throw new ApiError(404, "Purchase order not found");
  }

  const grns: any[] = await GoodsReceipt.find({
    _id: { $in: invoice.goodsReceiptIds || [] },
    status: { $in: ["PARTIAL", "FULL"] },
  }).lean();

  /* ------------------------------------------------------ */
  /* Build GRN received map                                 */
  /* ------------------------------------------------------ */

  const receivedMap = new Map<string, number>();

  for (const grn of grns) {
    for (const item of grn.items || []) {
      const key = String(item.purchaseOrderItemId);

      receivedMap.set(
        key,
        (receivedMap.get(key) || 0) + Number(item.acceptedQuantity || 0),
      );
    }
  }

  /* ------------------------------------------------------ */
  /* Matching Logic                                         */
  /* ------------------------------------------------------ */

  let anyMismatch = false;

  const updatedItems = invoice.items.map((invItem: any) => {
    const poItem = po.items.find(
      (x: any) => String(x._id) === String(invItem.purchaseOrderItemId),
    );

    if (!poItem) return invItem;

    const receivedQty = Number(receivedMap.get(String(poItem._id)) || 0);

    const poPrice = Number(poItem.netPrice || 0);

    const reasons: string[] = [];

    /* Quantity Check */
    if (invItem.invoicedQuantity > receivedQty) {
      reasons.push("Quantity mismatch");
    }

    /* Price Check */
    if (invItem.invoiceUnitPrice !== poPrice) {
      reasons.push("Price mismatch");
    }

    let matchStatus = "MATCHED";

    if (reasons.length > 0) {
      anyMismatch = true;

      if (reasons.length > 1) {
        matchStatus = "MULTIPLE_MISMATCH";
      } else if (reasons[0] === "Price mismatch") {
        matchStatus = "PRICE_MISMATCH";
      } else {
        matchStatus = "QUANTITY_MISMATCH";
      }
    }

    return {
      ...invItem,
      matchStatus,
      mismatchReason: reasons.join(", ") || null,
    };
  });

  return {
    items: updatedItems,
    headerMatchStatus: anyMismatch ? "MULTIPLE_MISMATCH" : "MATCHED",
    anyMismatch,
  };
};

export const approveInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { invoiceId } = req.params;
    const user: any = req.user;

    const Invoice = req.tenantConnection.model("VendorInvoice");

    const invoice: any = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    if (invoice.status === "APPROVED") {
      throw new ApiError(400, "Already approved");
    }

    /* ------------------------------------------------ */
    /* RUN MATCHING ENGINE HERE                         */
    /* ------------------------------------------------ */

    const result = await invoiceAndGoodsAndPurchaseOrderMatch(
      req.tenantConnection,
      invoiceId,
    );

    invoice.items = result.items;
    invoice.matchStatus = result.headerMatchStatus;

    if (result.anyMismatch) {
      invoice.status = "MISMATCH";
    } else {
      invoice.status = "APPROVED";
      invoice.approvedAt = new Date();
      invoice.approvedBy = user._id;
    }

    await invoice.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Invoice processed successfully",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};
