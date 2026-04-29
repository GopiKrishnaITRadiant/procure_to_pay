import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { generatePOCode } from "../../utils/codeGenerator";
import mongoose from "mongoose";

export async function createDirectPurchaseOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { tenantConnection, user, body } = req;

    if (!tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    let {
      vendorId,
      items,
      companyCode,
      purchasingOrganization,
      purchasingGroup,
      currency,
      paymentTerms,
      incoterms,
      remarks,
      deliveryAddress,
    } = body;

    // ---------------------------------------------------
    // Header Validations
    // ---------------------------------------------------
    if (!vendorId) {
      throw new ApiError(400, "vendorId is required");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "At least one item is required");
    }

    if (!currency) {
      throw new ApiError(400, "currency is required");
    }

    currency = currency.trim().toUpperCase();

    const PurchaseOrder = tenantConnection.model("PurchaseOrder");
    const Vendor = tenantConnection.model("Vendor");
    const Material = tenantConnection.model("Material");
    // const AuditLog = tenantConnection.model("AuditLog");

    // ---------------------------------------------------
    // Vendor Validation
    // ---------------------------------------------------
    const vendor = await Vendor.findOne({
      _id: vendorId,
      isActive: true,
      vendorType: "INTERNAL",
    });

    if (!vendor) {
      throw new ApiError(400, "Valid active internal vendor not found");
    }

    // ---------------------------------------------------
    // Load Materials
    // ---------------------------------------------------
    const materialIds = items
      .filter((x: any) => x.materialId)
      .map((x: any) => x.materialId);

    const materials = materialIds.length
      ? await Material.find({
          _id: { $in: materialIds },
          isActive: true,
        })
      : [];

    const materialMap = new Map(
      materials.map((m: any) => [m._id.toString(), m]),
    );

    // ---------------------------------------------------
    // Build Items
    // ---------------------------------------------------
    let totalMinor = 0;

    const poItems = items.map((item: any, index: number) => {
      let {
        materialId,
        description,
        quantity,
        unitOfMeasure,
        netPrice,
        currency: itemCurrency,
        deliveryDate,
        taxPercent = 0,
        discount = 0,
      } = item;

      const row = index + 1;

      if (materialId && !materialMap.has(materialId.toString())) {
        throw new ApiError(400, `Item ${row}: material not found`);
      }

      const material = materialId
        ? materialMap.get(materialId.toString())
        : null;

      description =
        description?.trim() ||
        material?.description ||
        material?.materialDescription;

      if (!description) {
        throw new ApiError(400, `Item ${row}: description is required`);
      }

      quantity = Number(quantity);
      netPrice = Number(netPrice);
      taxPercent = Number(taxPercent);
      discount = Number(discount);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ApiError(400, `Item ${row}: quantity must be > 0`);
      }

      if (!Number.isFinite(netPrice) || netPrice < 0) {
        throw new ApiError(400, `Item ${row}: netPrice must be >= 0`);
      }

      if (!Number.isFinite(taxPercent) || taxPercent < 0) {
        throw new ApiError(400, `Item ${row}: invalid taxPercent`);
      }

      if (!Number.isFinite(discount) || discount < 0) {
        throw new ApiError(400, `Item ${row}: invalid discount`);
      }

      if (itemCurrency) {
        itemCurrency = itemCurrency.trim().toUpperCase();

        if (itemCurrency !== currency) {
          throw new ApiError(
            400,
            `Item ${row}: currency mismatch. Expected ${currency}`,
          );
        }
      }

      const priceMinor = Math.round(netPrice * 100);
      const lineSubTotalMinor = priceMinor * quantity;
      const discountMinor = Math.round(discount * 100);
      const taxableMinor = lineSubTotalMinor - discountMinor;
      const taxMinor = Math.round((taxableMinor * taxPercent) / 100);
      const lineTotalMinor = taxableMinor + taxMinor;

      totalMinor += lineTotalMinor;

      return {
        itemNumber: String(row * 10).padStart(5, "0"),
        materialId: materialId || null,
        materialCode: material?.materialCode || null,
        description,
        quantity,
        unitOfMeasure: unitOfMeasure || material?.baseUnitOfMeasure || "EA",
        netPrice,
        currency,
        taxPercent,
        discount,
        lineTotal: Number((lineTotalMinor / 100).toFixed(2)),
        receivedQty: 0,
        invoicedQty: 0,
        status: "OPEN",
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      };
    });

    // ---------------------------------------------------
    // Generate PO Number
    // ---------------------------------------------------
    const purchaseOrderNumber = await generatePOCode(tenantConnection);

    // ---------------------------------------------------
    // Create PO
    // ---------------------------------------------------
    const poPayload = {
      tenantId: user?.tenantId,
      purchaseOrderNumber,
      purchaseOrderType: "NB",
      source: "DIRECT",
      companyCode,
      purchasingOrganization,
      purchasingGroup,
      vendorId,
      currency,
      paymentTerms: paymentTerms || null,
      incoterms: incoterms || null,
      remarks: remarks || null,
      deliveryAddress: deliveryAddress || null,

      creationDate: new Date(),
      purchaseOrderDate: new Date(),

      items: poItems,

      totalNetAmount: Number((totalMinor / 100).toFixed(2)),

      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: user?.userId,

      createdBy: user?.userId,
    };

    const po = await PurchaseOrder.create(poPayload);

    // ---------------------------------------------------
    // Audit Log
    // ---------------------------------------------------
    // await AuditLog.create({
    //   module: "PURCHASE_ORDER",
    //   documentId: po._id,
    //   action: "CREATE_DIRECT_PO",
    //   remarks: `Direct PO ${purchaseOrderNumber} created for internal vendor`,
    //   performedBy: user?.userId,
    // });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Direct Purchase Order created successfully",
      data: po,
    });
  } catch (error) {
    next(error);
  }
}

// export async function createRFQPurchaseOrder(
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) {
//   if(!req.tenantConnection) return res.status(500).json({ message: "Tenant connection not found" });

//   const session = await req.tenantConnection.startSession();

//   try {
//     session.startTransaction();

//     const { tenantConnection, user, params } = req;
//     const { rfqId } = params;

//     if (!tenantConnection) {
//       throw new ApiError(500, "Tenant connection not found");
//     }

//     const RFQ = tenantConnection.model("RFQ");
//     const Quotation = tenantConnection.model("Quotation");
//     const QuotationItem = tenantConnection.model("QuotationItem");
//     const PurchaseOrder = tenantConnection.model("PurchaseOrder");
//     const Vendor = tenantConnection.model("Vendor");

//     // 1. FETCH RFQ
//     const rfq = await RFQ.findById(rfqId).session(session);

//     if (!rfq) {
//       throw new ApiError(404, "RFQ not found");
//     }

//     if (
//       ![
//         "AWARDED",
//         "PARTIALLY_AWARDED",
//         "AWARD_REVISED",
//       ].includes(rfq.status)
//     ) {
//       throw new ApiError(
//         400,
//         "RFQ is not eligible for PO creation"
//       );
//     }

//     // 2. FETCH AWARDED QUOTATIONS
//     const quotations = await Quotation.find({
//       rfqId,
//       status: {
//         $in: ["AWARDED", "PARTIALLY_AWARDED"],
//       },
//     }).session(session);

//     if (!quotations.length) {
//       throw new ApiError(
//         400,
//         "No awarded quotations found"
//       );
//     }

//     const quotationIds = quotations.map(
//       (quotation: any) => quotation._id
//     );

//     const quotationItems =
//       await QuotationItem.find({
//         quotationId: { $in: quotationIds },
//         isAwarded: true,
//       }).session(session);

//     if (!quotationItems.length) {
//       throw new ApiError(
//         400,
//         "No awarded quotation items found"
//       );
//     }

//     // 3. GROUP BY VENDOR
//     const quotationMap = new Map(
//       quotations.map((quotation: any) => [
//         quotation._id.toString(),
//         quotation,
//       ])
//     );

//     const vendorWiseMap = new Map<
//       string,
//       {
//         quotation: any;
//         items: any[];
//       }
//     >();

//     for (const item of quotationItems) {
//       const quotation = quotationMap.get(
//         item.quotationId.toString()
//       );

//       if (!quotation) continue;

//       const vendorId =
//         quotation.vendorId.toString();

//       if (!vendorWiseMap.has(vendorId)) {
//         vendorWiseMap.set(vendorId, {
//           quotation,
//           items: [],
//         });
//       }

//       vendorWiseMap.get(vendorId)?.items.push(
//         item
//       );
//     }

//     if (vendorWiseMap.size === 0) {
//       throw new ApiError(
//         400,
//         "No vendor award data found"
//       );
//     }

//     // 4. CREATE PO PER VENDOR
//     const createdPOs: any[] = [];

//     for (const [
//       vendorId,
//       vendorData,
//     ] of vendorWiseMap.entries()) {
//       const { quotation, items } = vendorData;

//       // duplicate prevention
//       const existingPO =
//         await PurchaseOrder.findOne({
//           rfqId,
//           vendorId,
//           status: {
//             $ne: "CANCELLED",
//           },
//         }).session(session);

//       if (existingPO) {
//         continue;
//       }

//       const vendor =
//         await Vendor.findById(vendorId).session(
//           session
//         );

//       let lineNumber = 10;

//       const poItems = items.map(
//         (item: any) => {
//           const lineAmount =
//             Number(
//               item.convertedQuantity
//             ) *
//             Number(
//               item.convertedUnitPrice
//             );

//           const result = {
//             itemNumber:
//               String(lineNumber),
//             description:
//               item.description ||
//               "RFQ Award Item",

//             quantity: Number(
//               item.convertedQuantity
//             ),

//             unitOfMeasure:
//               item.rfqUnitOfMeasure,

//             netPrice: Number(
//               item.convertedUnitPrice
//             ),

//             currency:
//               quotation.quotationCurrency,

//             deliveryDate:
//               item.deliveryDate ||
//               quotation.deliveryDate,

//             rfqId,
//             rfqItemId:
//               item.rfqItemId,

//             quotationId:
//               quotation._id,

//             status: "OPEN",
//           };

//           lineNumber += 10;

//           return result;
//         }
//       );

//       const totalNetAmount =
//         poItems.reduce(
//           (
//             sum: number,
//             item: any
//           ) =>
//             sum +
//             item.quantity *
//               item.netPrice,
//           0
//         );

//       const po =
//         await PurchaseOrder.create(
//           [
//             {
//               tenantId:
//                 user?.tenantId,

//               vendorId,

//               supplierName:
//                 vendor?.companyName ||
//                 "",

//               rfqId,

//               purchaseOrderNumber:
//                 await generatePOCode(
//                   tenantConnection
//                 ),

//               purchaseOrderType:
//                 "NB",

//               companyCode:
//                 rfq.companyCode ||
//                 "DEFAULT",

//               purchasingOrganization:
//                 rfq.purchasingOrganization ||
//                 "DEFAULT",

//               purchasingGroup:
//                 rfq.purchasingGroup,

//               currency:
//                 quotation.quotationCurrency,

//               exchangeRate:
//                 quotation.exchangeRate,

//               paymentTerms:
//                 quotation.paymentTerms,

//               creationDate:
//                 new Date(),

//               purchaseOrderDate:
//                 new Date(),

//               totalNetAmount:
//                 Number(
//                   totalNetAmount.toFixed(
//                     2
//                   )
//                 ),

//               items: poItems,

//               source: "RFQ",

//               status:
//                 "CREATED",

//               syncStatus:
//                 "PENDING",

//               createdBy:
//                 user?.userId,
//             },
//           ],
//           { session }
//         );

//       createdPOs.push(po[0]);
//     }

//     if (!createdPOs.length) {
//       throw new ApiError(
//         400,
//         "PO already exists for awarded vendors"
//       );
//     }

//     // 5. UPDATE RFQ STATUS
//     rfq.status = "PO_CREATED";
//     await rfq.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return sendResponse({
//       res,
//       statusCode: 201,
//       message:
//         "Purchase Order(s) created successfully",
//       data: createdPOs,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     next(error);
//   }
// }

export async function createRFQPurchaseOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantConnection, user, params } = req;
    const { rfqId } = params;

    if (!tenantConnection) {
      return res.status(500).json({
        message: "Tenant connection not found",
      });
    }

    const RFQ = tenantConnection.model("RFQ");
    const Quotation = tenantConnection.model("Quotation");
    const QuotationItem = tenantConnection.model("QuotationItem");
    const PurchaseOrder = tenantConnection.model("PurchaseOrder");
    const Vendor = tenantConnection.model("Vendor");

    // 1. FETCH RFQ
    const rfq = await RFQ.findById(rfqId);

    if (!rfq) throw new ApiError(404, "RFQ not found");

    if (!["AWARDED", "PARTIALLY_AWARDED", "AWARD_REVISED"].includes(rfq.status)) {
      throw new ApiError(400, "RFQ is not eligible for PO creation");
    }

    // 2. FETCH QUOTATIONS
    const quotations = await Quotation.find({
      rfqId,
      status: { $in: ["AWARDED", "PARTIALLY_AWARDED"] },
    });

    if (!quotations.length) {
      throw new ApiError(400, "No awarded quotations found");
    }

    const quotationIds = quotations.map((q: any) => q._id);

    const quotationItems = await QuotationItem.find({
      quotationId: { $in: quotationIds },
      isAwarded: true,
    });

    if (!quotationItems.length) {
      throw new ApiError(400, "No awarded quotation items found");
    }

    // 3. GROUP BY VENDOR
    const quotationMap = new Map(
      quotations.map((q: any) => [q._id.toString(), q])
    );

    const vendorWiseMap = new Map<
      string,
      { quotation: any; items: any[] }
    >();

    for (const item of quotationItems) {
      const quotation = quotationMap.get(item.quotationId.toString());
      if (!quotation) continue;

      const vendorId = quotation.vendorId.toString();

      if (!vendorWiseMap.has(vendorId)) {
        vendorWiseMap.set(vendorId, {
          quotation,
          items: [],
        });
      }

      vendorWiseMap.get(vendorId)!.items.push(item);
    }

    if (vendorWiseMap.size === 0) {
      throw new ApiError(400, "No vendor award data found");
    }

    // 4. CREATE PO PER VENDOR
    const createdPOs: any[] = [];

    for (const [vendorId, vendorData] of vendorWiseMap.entries()) {
      const { quotation, items } = vendorData;

      const existingPO = await PurchaseOrder.findOne({
        rfqId,
        vendorId,
        status: { $ne: "CANCELLED" },
      });

      if (existingPO) continue;

      const vendor = await Vendor.findById(vendorId);

      let lineNumber = 10;

      const poItems = items.map((item: any) => {
        const netPrice = Number(item.convertedUnitPrice);
        const quantity = Number(item.convertedQuantity);

        return {
          itemNumber: String(lineNumber++),
          description: item.description || "RFQ Award Item",
          quantity,
          unitOfMeasure: item.rfqUnitOfMeasure,
          netPrice,
          currency: quotation.quotationCurrency,
          deliveryDate: item.deliveryDate || quotation.deliveryDate,
          rfqId,
          rfqItemId: item.rfqItemId,
          quotationId: quotation._id,
          status: "OPEN",
        };
      });

      const totalNetAmount = poItems.reduce(
        (sum, i) => sum + i.quantity * i.netPrice,
        0
      );

      const po = await PurchaseOrder.create({
        tenantId: user?.tenantId,
        vendorId,
        supplierName: vendor?.companyName || "",
        rfqId,
        purchaseOrderNumber: await generatePOCode(tenantConnection),
        purchaseOrderType: "NB",
        companyCode: rfq.companyCode || "DEFAULT",
        purchasingOrganization: rfq.purchasingOrganization || "DEFAULT",
        purchasingGroup: rfq.purchasingGroup,
        currency: quotation.quotationCurrency,
        exchangeRate: quotation.exchangeRate,
        paymentTerms: quotation.paymentTerms,
        creationDate: new Date(),
        purchaseOrderDate: new Date(),
        totalNetAmount: Number(totalNetAmount.toFixed(2)),
        items: poItems,
        source: "RFQ",
        status: "CREATED",
        syncStatus: "PENDING",
        createdBy: user?.userId,
      });

      createdPOs.push(po);
    }

    if (!createdPOs.length) {
      throw new ApiError(400, "PO already exists for awarded vendors");
    }

    // 5. UPDATE RFQ (NO SESSION)
    rfq.status = "PO_CREATED";
    await rfq.save();

    return sendResponse({
      res,
      statusCode: 201,
      message: "Purchase Order(s) created successfully (DEV MODE)",
      data: createdPOs,
    });
  } catch (error) {
    next(error);
  }
}

export const getPurchaseOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { purchaseOrderId } = req.params;
    const user = req.user;

    if (!req.tenantConnection) {
      throw new ApiError(
        500,
        "Tenant connection not found",
        "INTERNAL_ERROR"
      );
    }

    if (!purchaseOrderId) {
      throw new ApiError(400, "Purchase Order ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(purchaseOrderId as any)) {
      throw new ApiError(400, "Invalid Purchase Order ID");
    }

    const PurchaseOrder = req.tenantConnection.model("PurchaseOrder");
    const GoodsReceipt = req.tenantConnection.model("PurchaseOrder");
    const Invoice = req.tenantConnection.model("PurchaseOrder");
    const AuditLog = req.tenantConnection.model("PurchaseOrder");

    // ---------------------------
    // Fetch Purchase Order
    // ---------------------------
    const purchaseOrder:any = await PurchaseOrder.findById(purchaseOrderId)
      .populate("vendorId", "companyName vendorCode email phone")
      .populate("rfqId", "rfqNumber status")
      .populate("createdBy", "name email")
      // .populate("approvedBy", "name email")
      .lean();

    if (!purchaseOrder) {
      throw new ApiError(404, "Purchase Order not found");
    }

    // ---------------------------
    // Role Based Access Example
    // ---------------------------
    // if (
    //   user?.role !== "SUPER_ADMIN" &&
    //   purchaseOrder.createdBy?._id?.toString() !== user?._id?.toString()
    // ) {
    //   // optional if needed
    //   // throw new ApiError(403, "Access denied");
    // }

    // ---------------------------
    // Related Documents
    // ---------------------------
    const [receipts, invoices, auditLogs] = await Promise.all([
      GoodsReceipt.find(
        { purchaseOrderId: purchaseOrder._id },
        {
          grnNumber: 1,
          status: 1,
          totalReceivedQty: 1,
          createdAt: 1,
        }
      )
        .sort({ createdAt: -1 })
        .lean(),

      Invoice.find(
        { purchaseOrderId: purchaseOrder._id },
        {
          invoiceNumber: 1,
          status: 1,
          totalAmount: 1,
          createdAt: 1,
        }
      )
        .sort({ createdAt: -1 })
        .lean(),

      AuditLog.find(
        { documentId: purchaseOrder._id, module: "PURCHASE_ORDER" },
        {
          action: 1,
          performedBy: 1,
          remarks: 1,
          createdAt: 1,
        }
      )
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    // ---------------------------
    // Item Summary
    // ---------------------------
    let orderedQty = 0;
    let receivedQty = 0;
    let subtotal = 0;
    let taxAmount = 0;

    const items =
      purchaseOrder.items?.map((item: any) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const tax = Number(item.taxAmount || 0);
        const received = Number(item.receivedQty || 0);

        const lineTotal = qty * unitPrice;

        orderedQty += qty;
        receivedQty += received;
        subtotal += lineTotal;
        taxAmount += tax;

        return {
          ...item,
          lineTotal,
          pendingQty: qty - received,
        };
      }) || [];

    const grandTotal =
      subtotal +
      taxAmount 
      // Number(purchaseOrder.freightCharges || 0) -
      // Number(purchaseOrder.discountAmount || 0);

    const paidAmount = invoices
      .filter((inv: any) => inv.status === "PAID")
      .reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || 0), 0);

    const summary = {
      totalItems: items.length,
      orderedQty,
      receivedQty,
      pendingQty: orderedQty - receivedQty,
      subtotal,
      taxAmount,
      // freightCharges: Number(purchaseOrder.freightCharges || 0),
      // discountAmount: Number(purchaseOrder.discountAmount || 0),
      grandTotal,
      paidAmount,
      dueAmount: grandTotal - paidAmount,
      openItems: items.filter((i: any) => i.pendingQty > 0).length,
    };

    return sendResponse({
      res,
      statusCode: 200,
      message: "Purchase Order fetched successfully",
      data: {
        header: {
          // _id: purchaseOrder._id,
          // poNumber: purchaseOrder.poNumber,
          // status: purchaseOrder.status,
          // vendor: purchaseOrder.vendorId,
          // rfq: purchaseOrder.rfqId,
          // currency: purchaseOrder.currency,
          // paymentTerms: purchaseOrder.paymentTerms,
          // deliveryDate: purchaseOrder.deliveryDate,
          // createdBy: purchaseOrder.createdBy,
          // approvedBy: purchaseOrder.approvedBy,
          // createdAt: purchaseOrder.createdAt,
          // approvedAt: purchaseOrder.approvedAt,
        },
        items,
        summary,
        receipts,
        invoices,
        auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};