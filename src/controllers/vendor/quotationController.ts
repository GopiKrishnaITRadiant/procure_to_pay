import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { UOMConversionModel } from "../../models/uomConversionModel";

export const getVendorRFQs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const RFQItem = req.tenantConnection.model("RFQItem");

    const vendorId = user?.vendorId;

    if (!vendorId) {
      throw new ApiError(400, "Vendor not found in user context");
    }

    // 1. Get RFQs
    const rfqs = await RFQ.find({
      vendors: vendorId,
      status: "SENT",
      submissionDeadline: { $gte: new Date() },
    })
      // .populate(
      //   "requisitionId",
      //   "_id requisitionNumber requiredDate items currency totalEstimatedAmount description paymentTerms"
      // )
      .sort({ createdAt: -1 })
      .lean();

    if (!rfqs.length) {
      return sendResponse({
        res,
        statusCode: 200,
        message: "No RFQs found",
        data: [],
      });
    }

    const rfqIds = rfqs.map((r) => r._id);

    // 2. Get RFQ Items
    const rfqItems = await RFQItem.find({
      rfqId: { $in: rfqIds },
    })
      .populate("materialId")
      .lean();

    // 3. Map items to RFQs
    const rfqWithItems = rfqs.map((rfq) => ({
      ...rfq,
      items: rfqItems.filter(
        (item: any) => item.rfqId.toString() === rfq._id.toString(),
      ),
    }));

    return sendResponse({
      res,
      statusCode: 200,
      message: "Vendor RFQs fetched",
      data: rfqWithItems,
    });
  } catch (err) {
    next(err);
  }
};

export const submitQuotation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { rfqId } = req.params;

    let {
      items,
      tax = 0,
      shippingCost = 0,
      paymentTerms,
      creditPeriod,
      deliveryDate,
      attachments = [],
    } = req.body;

    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(
        500,
        "Tenant connection not found",
        "INTERNAL_ERROR"
      );
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const RFQItem = req.tenantConnection.model("RFQItem");
    const Quotation = req.tenantConnection.model("Quotation");
    const QuotationItem = req.tenantConnection.model("QuotationItem");
    const Vendor = req.tenantConnection.model("Vendor");

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) {
      throw new ApiError(404, "RFQ not found");
    }

    if (rfq.status !== "SENT") {
      throw new ApiError(
        400,
        `RFQ status is ${rfq.status}. Cannot submit quotation`
      );
    }

    if (rfq.submissionDeadline < new Date()) {
      throw new ApiError(400, "RFQ submission deadline passed");
    }

    // ---------------- Vendor Validation ----------------
    const vendor = await Vendor.findById(user?.vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found");
    }

    if (!vendor.capabilities?.canParticipateInRFQ) {
      throw new ApiError(
        403,
        "Vendor not allowed to participate in RFQ"
      );
    }

    const invited = rfq.vendors.some(
      (id: any) =>
        id.toString() === user?.vendorId?.toString()
    );

    if (!invited) {
      throw new ApiError(
        403,
        "You are not invited to this RFQ"
      );
    }

    // ---------------- Duplicate Check ----------------
    const existingQuotation = await Quotation.findOne({
      rfqId,
      vendorId: user?.vendorId,
    });

    if (existingQuotation) {
      throw new ApiError(
        400,
        "Quotation already submitted"
      );
    }

    if (typeof items === "string") {
      items = JSON.parse(items);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(
        400,
        "At least one item must be quoted"
      );
    }

    const rfqItems = await RFQItem.find({ rfqId }).lean();

    const rfqItemMap = new Map(
      rfqItems.map((item: any) => [
        item._id.toString(),
        item,
      ])
    );

    const processedItems = await Promise.all(
      items.map(async (item: any, index: number) => {
        const rfqItem = rfqItemMap.get(
          item.rfqItemId?.toString()
        );

        if (!rfqItem) {
          throw new ApiError(
            400,
            `Invalid RFQ item at line ${index + 1}`
          );
        }

        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);

        if (!quantity || quantity <= 0) {
          throw new ApiError(
            400,
            `Invalid quantity at line ${index + 1}`
          );
        }

        if (
          Number.isNaN(unitPrice) ||
          unitPrice < 0
        ) {
          throw new ApiError(
            400,
            `Invalid unit price at line ${index + 1}`
          );
        }

        if (!item.unitOfMeasure) {
          throw new ApiError(
            400,
            `UOM required at line ${index + 1}`
          );
        }

        let convertedQuantity = quantity;
        let convertedUnitPrice = unitPrice;
        let normalizedUOM = item.unitOfMeasure;

        // ---------- UOM Conversion ----------
        if (
          item.unitOfMeasure !==
          rfqItem.unitOfMeasure
        ) {
          const conversion =
            await UOMConversionModel.findOne({
              fromUOM: item.unitOfMeasure,
              toUOM: rfqItem.unitOfMeasure,
              isActive: true,
            });

          if (!conversion) {
            throw new ApiError(
              400,
              `UOM conversion not configured (${item.unitOfMeasure} -> ${rfqItem.unitOfMeasure})`
            );
          }

          convertedQuantity =
            quantity * Number(conversion.factor);

          convertedUnitPrice =
            unitPrice / Number(conversion.factor);

          normalizedUOM =
            rfqItem.unitOfMeasure;
        }

        // Validate after conversion
        if (
          convertedQuantity >
          Number(rfqItem.quantity)
        ) {
          throw new ApiError(
            400,
            `Quoted quantity exceeds RFQ quantity at line ${index + 1}`
          );
        }

        const totalPrice =
          quantity * unitPrice;

        const convertedLineAmount =
          convertedQuantity *
          convertedUnitPrice;

        return {
          quotationId: null,

          rfqItemId: rfqItem._id,

          quotedQuantity: quantity,
          quotedUnitPrice: unitPrice,
          quotedLineAmount: totalPrice,
          quotedUnitOfMeasure:
            item.unitOfMeasure,

          rfqUnitOfMeasure:
            rfqItem.unitOfMeasure,

          convertedQuantity,
          convertedUnitPrice,
          convertedLineAmount,
          isAwarded: false,
        };
      })
    );

    // ---------------- Totals ----------------
    tax = Number(tax) || 0;
    shippingCost = Number(shippingCost) || 0;

    const totalAmount =
      processedItems.reduce(
        (sum: number, item: any) =>
          sum + item.totalPrice,
        0
      );

    const grandTotalAmount =
      totalAmount + tax + shippingCost;

    // ---------------- Currency ----------------
    const quotationCurrency =
      vendor.currency ||
      rfq.currency ||
      "INR";

    const baseCurrency =
      rfq.baseCurrency ||
      rfq.currency ||
      "INR";

    let exchangeRate = 1;

    if (
      quotationCurrency !== baseCurrency
    ) {
      // Replace with live FX service
      exchangeRate = 83;
    }

    const baseTotalAmount =
      totalAmount * exchangeRate;

    const baseTaxAmount =
      tax * exchangeRate;

    const baseShippingAmount =
      shippingCost * exchangeRate;

    const baseGrandTotalAmount =
      grandTotalAmount * exchangeRate;

    // ---------------- Create Header ----------------
    const quotation = await Quotation.create({
      rfqId,
      vendorId: user?.vendorId,

      quotationCurrency,
      baseCurrency,
      exchangeRate,

      totalAmount,
      tax,
      shippingCost,
      grandTotalAmount,

      baseTotalAmount,
      baseTaxAmount,
      baseShippingAmount,
      baseGrandTotalAmount,

      paymentTerms,
      creditPeriod,
      deliveryDate,
      attachments,

      isPartial:
        processedItems.length <
        rfqItems.length,

      status: "SUBMITTED",
      submittedAt: new Date(),

      items: [],
      isSelected: false,
    });

    const createdItems =
      await QuotationItem.insertMany(
        processedItems.map(
          (item: any) => ({
            ...item,
            quotationId:
              quotation._id,
          })
        )
      );

    quotation.items = createdItems.map(
      (item: any) => item._id
    );

    await quotation.save();

    return sendResponse({
      res,
      statusCode: 201,
      message:
        "Quotation submitted successfully",
      data: quotation,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelQuotation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rfqId } = req.params;
    const { reason } = req.body;
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const Quotation = req.tenantConnection.model("Quotation");

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) throw new ApiError(404, "RFQ not found");

    // RFQ not open
    if (rfq.status !== "SENT") {
      throw new ApiError(400, "Cannot cancel quotation at this stage");
    }

    // Deadline passed
    if (rfq.submissionDeadline < new Date()) {
      throw new ApiError(400, "Cannot cancel after submission deadline");
    }

    const quotation = await Quotation.findOne({
      rfqId,
      vendorId: user?.vendorId,
    });

    if (!quotation) {
      throw new ApiError(404, "Quotation not found");
    }

    // Already cancelled
    if (quotation.status === "CANCELLED") {
      throw new ApiError(400, "Quotation already cancelled");
    }

    // Already awarded (extra safety)
    if (quotation.status === "AWARDED") {
      throw new ApiError(400, "Cannot cancel awarded quotation");
    }

    // Cancel quotation
    quotation.status = "CANCELLED";
    quotation.cancelledAt = new Date();
    quotation.cancelledBy = user?.userId;
    quotation.cancellationReason = reason || null;

    await quotation.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Quotation cancelled successfully",
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};
