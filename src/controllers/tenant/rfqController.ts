import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { generateRFQNumber } from "../../utils/codeGenerator";
import { sendResponse } from "../../utils/sendResponse";
import { IQuotation } from "../../models/vendor/quotationModel";

export const createRFQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      requisitionId,
      submissionDeadline,
      vendors,
      description,
      paymentTerms,
    } = req.body;
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Requisition = req.tenantConnection.model("Requisition");
    const RFQ = req.tenantConnection.model("RFQ");
    const RFQItem = req.tenantConnection.model("RFQItem");
    const Vendor = req.tenantConnection.model("Vendor");

    const requisition = await Requisition.findById(requisitionId);

    if (!requisition) throw new ApiError(404, "Requisition not found");

    if (requisition.status !== "APPROVED") {
      throw new ApiError(400, "Only approved PR can create RFQ");
    }

    if (!vendors || !vendors.length) {
      throw new ApiError(400, "At least one vendor is required");
    }

    const vendorDocs = await Vendor.find({ _id: { $in: vendors } });

    const foundVendorIds = vendorDocs.map((v) => v._id.toString());

    const missingVendors = vendors.filter(
      (id: string) => !foundVendorIds.includes(id.toString()),
    );

    if (missingVendors.length > 0) {
      throw new ApiError(400, `Vendor not found: ${missingVendors.join(", ")}`);
    }

    const rfqNumber = await generateRFQNumber(req.tenantConnection);

    const rfq = await RFQ.create({
      rfqNumber,
      requisitionId,
      submissionDeadline,
      vendors,
      description,
      paymentTerms,
      createdBy: user?.userId,
      status: "DRAFT",
    });

    const items = requisition.items.map((item: any) => ({
      rfqId: rfq._id,
      requisitionItemId: item._id,
      itemNumber: item.itemNumber,
      material: item.material,
      materialId: item.materialId,
      description: item.description,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      requiredDate: item.requiredDate,
      plant: item.plant,
      status: "OPEN",
    }));

    await RFQItem.insertMany(items);

    return sendResponse({
      res,
      statusCode: 201,
      message: "RFQ created successfully",
      data: rfq,
    });
  } catch (err) {
    next(err);
  }
};

export const sendRFQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rfqId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) throw new ApiError(404, "RFQ not found");

    if (!rfq.vendors || rfq.vendors.length === 0) {
      throw new ApiError(400, "No vendors assigned to RFQ");
    }

    if (rfq.status !== "DRAFT") {
      throw new ApiError(400, "RFQ already sent");
    }

    rfq.status = "SENT";

    await rfq.save();

    // Trigger notifications (email/portal)
    // notifyVendors(rfq.vendors)

    return sendResponse({
      res,
      statusCode: 200,
      message: "RFQ sent to vendors",
      data: rfq,
    });
  } catch (err) {
    next(err);
  }
};

export const getRFQComparison = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rfqId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const RFQItem = req.tenantConnection.model("RFQItem");
    const Quotation = req.tenantConnection.model("Quotation");
    const Vendor = req.tenantConnection.model("Vendor");

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) throw new ApiError(404, "RFQ not found");

    const rfqItems = await RFQItem.find({ rfqId });

    const quotations:IQuotation[] = await Quotation.find({ rfqId });

    const vendorIds = quotations.map((q: any) => q.vendorId);
    const vendors = await Vendor.find({ _id: { $in: vendorIds } });

    const vendorMap: any = vendors.reduce((acc: any, v: any) => {
      acc[v._id.toString()] = v;
      return acc;
    }, {});

    // ITEM-WISE COMPARISON
    const itemComparison = rfqItems.map((rfqItem: any) => {
      const comparisons = quotations.map((q: any) => {
        const quotedItem = q.items.find(
          (item: any) =>
            item.rfqItemId?.toString() ===
            rfqItem._id.toString(),
        );

        return {
          vendorId: q.vendorId,
          vendorName: vendorMap[q.vendorId.toString()]?.companyName || null,
          quotationId: q._id,

          unitPrice: quotedItem?.unitPrice || null,
          totalPrice: quotedItem?.totalPrice || null,
          quotedQty: quotedItem?.quantity || 0,

          // flags
          missing: !quotedItem,
          quantityMismatch:
            quotedItem && quotedItem.quantity !== rfqItem.quantity,
        };
      });

      const validPrices = comparisons
        .filter((c: any) => c.totalPrice !== null)
        .map((c: any) => c.totalPrice);

      const lowestPrice =
        validPrices.length > 0 ? Math.min(...validPrices) : null;

      return {
        rfqItemId: rfqItem._id,
        itemNumber: rfqItem.itemNumber,
        description: rfqItem.description,
        quantity: rfqItem.quantity,
        unit: rfqItem.unitOfMeasure,

        lowestPrice,
        comparisons,
      };
    });

    // Vendor summary
    const vendorSummary = quotations.map((q: any) => ({
      quotationId: q._id,
      vendorId: q.vendorId,
      vendorName: vendorMap[q.vendorId.toString()]?.companyName || null,
      totalAmount: q.totalAmount,
    }));

    return sendResponse({
      res,
      statusCode: 200,
      data: {
        rfq,
        items: itemComparison,
        vendors: vendorSummary, // optional summary
      },
    });
  } catch (err) {
    next(err);
  }
};

export const awardRFQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rfqId } = req.params;
    const { quotationId } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const Quotation = req.tenantConnection.model("Quotation");

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) throw new ApiError(404, "RFQ not found");

    const quotation = await Quotation.findById(quotationId);

    if (!quotation) throw new ApiError(404, "Quotation not found");

    rfq.status = "AWARDED";
    rfq.awardedVendor = quotation.vendorId;

    await rfq.save();

    // 🔥 Next step: Create PO
    // createPOFromQuotation(quotation)

    return sendResponse({
      res,
      statusCode: 200,
      message: "RFQ awarded successfully",
      data: rfq,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelRFQ = async (
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

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) throw new ApiError(404, "RFQ not found");

    // Already cancelled
    if (rfq.status === "CANCELLED") {
      throw new ApiError(400, "RFQ already cancelled");
    }

    // Already awarded
    if (rfq.status === "AWARDED") {
      throw new ApiError(400, "Cannot cancel awarded RFQ");
    }

    // Already moved to evaluation
    if (rfq.status === "EVALUATION") {
      throw new ApiError(400, "Cannot cancel RFQ in evaluation stage");
    }

    // Deadline passed (strict control)
    if (rfq.submissionDeadline && rfq.submissionDeadline < new Date()) {
      throw new ApiError(400, "Cannot cancel RFQ after submission deadline");
    }

    //Cancel
    rfq.status = "CANCELLED";
    rfq.cancelledAt = new Date();
    rfq.cancelledBy = user?.userId;
    rfq.cancellationReason = reason || null;

    await rfq.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "RFQ cancelled successfully",
      data: rfq,
    });
  } catch (err) {
    next(err);
  }
};

export const getRFQDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rfqId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const Quotation = req.tenantConnection.model("Quotation");
    const RFQItem = req.tenantConnection.model("RFQItem");

    const rfq = await RFQ.findById(rfqId).lean();

    if (!rfq) throw new ApiError(404, "RFQ not found");

    const items = await RFQItem.find({ rfqId }).lean();
    const quotations = await Quotation.find({ rfqId }).lean();

    return sendResponse({
      res,
      statusCode: 200,
      data: {
        ...rfq,
        items,
        quotations,
      },
    });
  } catch (err) {
    next(err);
  }
};
