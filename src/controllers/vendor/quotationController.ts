import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";

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
  next: NextFunction,
) => {
  try {
    const { rfqId } = req.params;
    let { items, totalAmount, currency } = req.body;
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const RFQItem = req.tenantConnection.model("RFQItem");
    const Quotation = req.tenantConnection.model("Quotation");
    const Vendor = req.tenantConnection.model("Vendor");

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) throw new ApiError(404, "RFQ not found");

    if (rfq.status !== "SENT") {
      throw new ApiError(400, `RFQ status is ${rfq.status}. Cannot submit quotation`);
    }

    if (rfq.submissionDeadline < new Date()) {
      throw new ApiError(400, "RFQ submission deadline passed");
    }

    // Vendor check
    const vendor = await Vendor.findById(user?.vendorId);
    if (!vendor) throw new ApiError(404, "Vendor not found");

    if (!vendor.capabilities?.canParticipateInRFQ) {
      throw new ApiError(403, "Vendor not allowed to participate in RFQ");
    }

    if (
      !rfq.vendors.some(
        (v: any) => v.toString() === user?.vendorId?.toString(),
      )
    ) {
      throw new ApiError(403, "You are not invited to this RFQ");
    }

    const existingQuotation = await Quotation.findOne({
      rfqId,
      vendorId: user?.vendorId,
    });

    if (existingQuotation) {
      throw new ApiError(400, "Quotation already submitted");
    }

    if (typeof items === "string") {
      items = JSON.parse(items);
    }

    if (!items || items.length === 0) {
      throw new ApiError(400, "At least one item must be quoted");
    }

    const rfqItems = await RFQItem.find({ rfqId }).lean();
    const rfqItemIds = rfqItems.map((i: any) => i._id.toString());

    items = items.map((item: any) => {
      if (!rfqItemIds.includes(item.rfqItemId)) {
        throw new ApiError(400, `Invalid RFQ item: ${item.rfqItemId}`);
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new ApiError(400, `Invalid quantity for item ${item.rfqItemId}`);
      }

      if (item.unitPrice == null || item.unitPrice < 0) {
        throw new ApiError(400, `Invalid price for item ${item.rfqItemId}`);
      }

      return {
        rfqItemId: item.rfqItemId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice:
          Number(item.totalPrice) ||
          Number(item.quantity) * Number(item.unitPrice),
      };
    });

    const calculatedTotalAmount = items.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0,
    );

    const finalTotalAmount =
      typeof totalAmount === "number" && totalAmount > 0
        ? totalAmount
        : calculatedTotalAmount;

    const quotation = await Quotation.create({
      rfqId,
      vendorId: user?.vendorId,
      items,
      totalAmount: finalTotalAmount,
      currency: currency || rfq.currency,
      isPartial: items.length < rfqItems.length,
      status: "SUBMITTED",
      submittedAt: new Date(),
      createdBy: user?.userId,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Quotation submitted successfully",
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
