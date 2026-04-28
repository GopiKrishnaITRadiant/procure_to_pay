import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { generateRFQNumber } from "../../utils/codeGenerator";
import { sendResponse } from "../../utils/sendResponse";
import { IQuotation } from "../../models/vendor/quotationModel";
import { IQuotationItem } from "../../models/vendor/quotationItemModel";
import mongoose, { Types } from "mongoose";

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
    const QuotationItem = req.tenantConnection.model("QuotationItem");
    const Vendor = req.tenantConnection.model("Vendor");

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) throw new ApiError(404, "RFQ not found");

    const rfqItems = await RFQItem.find({ rfqId }).lean();

    const quotations = await Quotation.find({
      rfqId,
      status: {
        $in: ["SUBMITTED", "REVISED"],
      },
    }).lean();

    const vendorIds = quotations.map((q: any) => q.vendorId);

    const vendors = await Vendor.find({
      _id: { $in: vendorIds },
    }).lean();

    const vendorMap = new Map(
      vendors.map((vendor: any) => [vendor._id.toString(), vendor]),
    );

    const quotationIds: Types.ObjectId[] = quotations.map(
      (q: any) => new mongoose.Types.ObjectId(q._id.toString()),
    );

    const quotationItems: IQuotationItem[] = await QuotationItem.find({
      quotationId: { $in: quotationIds },
    });

    // quotationId + rfqItemId map
    const quotationItemMap = new Map();

    for (const item of quotationItems) {
      const key = `${item.quotationId.toString()}_${item.rfqItemId.toString()}`;

      quotationItemMap.set(key, item);
    }

    // ITEM-WISE COMPARISON
    const itemComparison = rfqItems.map((rfqItem: any) => {
      const comparisons = quotations.map((quotation: any) => {
        const key = `${quotation._id.toString()}_${rfqItem._id.toString()}`;

        const quotedItem = quotationItemMap.get(key);

        const vendor = vendorMap.get(quotation.vendorId.toString());

        return {
          quotationId: quotation._id,

          vendorId: quotation.vendorId,

          vendorName: vendor?.companyName || null,

          quotationCurrency: quotation.quotationCurrency,

          baseCurrency: quotation.baseCurrency,

          exchangeRate: quotation.exchangeRate,

          // Original quoted values
          quotedQuantity: quotedItem?.quotedQuantity ?? 0,

          quotedUnitOfMeasure: quotedItem?.quotedUnitOfMeasure ?? null,

          quotedUnitPrice: quotedItem?.quotedUnitPrice ?? null,

          totalPrice: quotedItem?.totalPrice ?? null,

          // Normalized for comparison
          convertedQuantity: quotedItem?.convertedQuantity ?? 0,

          convertedUnitPrice: quotedItem?.convertedUnitPrice ?? null,

          convertedLineAmount: quotedItem?.convertedLineAmount ?? null,

          // Award status
          isAwarded: quotedItem?.isAwarded ?? false,

          // Flags
          missing: !quotedItem,

          quantityMismatch: quotedItem
            ? Number(quotedItem.convertedQuantity) !== Number(rfqItem.quantity)
            : false,
        };
      });

      // Lowest normalized price
      const validPrices = comparisons
        .filter((x: any) => x.convertedLineAmount !== null)
        .map((x: any) => x.convertedLineAmount);

      const lowestPrice =
        validPrices.length > 0 ? Math.min(...validPrices) : null;

      return {
        rfqItemId: rfqItem._id,

        itemNumber: rfqItem.itemNumber,

        description: rfqItem.description,

        quantity: rfqItem.quantity,

        unitOfMeasure: rfqItem.unitOfMeasure,

        lowestPrice,

        comparisons,
      };
    });

    // VENDOR SUMMARY
    const vendorSummary = quotations.map((quotation: any) => {
      const vendor = vendorMap.get(quotation.vendorId.toString());

      return {
        quotationId: quotation._id,

        vendorId: quotation.vendorId,

        vendorName: vendor?.companyName || null,

        quotationCurrency: quotation.quotationCurrency,

        baseCurrency: quotation.baseCurrency,

        totalAmount: quotation.totalAmount,

        grandTotalAmount: quotation.grandTotalAmount,

        baseGrandTotalAmount: quotation.baseGrandTotalAmount,

        status: quotation.status,
      };
    });

    return sendResponse({
      res,
      statusCode: 200,
      data: {
        rfq,
        items: itemComparison,
        vendors: vendorSummary,
      },
    });
  } catch (err) {
    next(err);
  }
};

//api for awarding and if we need to change award again we can use this api
export const awardRFQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rfqId } = req.params;
    const { awards } = req.body;
    const user = req.user;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    if (!Array.isArray(awards) || awards.length === 0) {
      throw new ApiError(400, "Awards data is required");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const RFQItem = req.tenantConnection.model("RFQItem");
    const Quotation = req.tenantConnection.model("Quotation");
    const QuotationItem = req.tenantConnection.model("QuotationItem");

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) {
      throw new ApiError(404, "RFQ not found");
    }

    const blockedStatuses = [
      "CANCELLED",
      "PO_CREATED",
      "CLOSED",
      "REJECTED",
    ];

    if (blockedStatuses.includes(rfq.status)) {
      throw new ApiError(
        400,
        `Cannot modify award. RFQ status is ${rfq.status}`
      );
    }

    const rfqItems = await RFQItem.find({ rfqId }).lean();

    if (!rfqItems.length) {
      throw new ApiError(400, "RFQ items not found");
    }

    const validRFQItemIds = new Set(
      rfqItems.map((item: any) => item._id.toString()),
    );

    //PAYLOAD VALIDATION
    //awards = [{ quotationId, rfqItemId }]
    const awardedRFQItemIds = awards.map((item: any) =>
      item.rfqItemId.toString(),
    );

    const duplicateRFQItemIds = awardedRFQItemIds.filter(
      (item: string, index: number) =>
        awardedRFQItemIds.indexOf(item) !== index,
    );

    if (duplicateRFQItemIds.length > 0) {
      throw new ApiError(
        400,
        "Same RFQ item cannot be awarded twice",
      );
    }

    for (const award of awards) {
      if (!award.quotationId || !award.rfqItemId) {
        throw new ApiError(
          400,
          "quotationId and rfqItemId are required",
        );
      }

      if (
        !validRFQItemIds.has(
          award.rfqItemId.toString(),
        )
      ) {
        throw new ApiError(
          400,
          `Invalid RFQ item ${award.rfqItemId}`,
        );
      }
    }

    //QUOTATION VALIDATION
    const quotationIds = [
      ...new Set(
        awards.map((item: any) =>
          item.quotationId.toString(),
        ),
      ),
    ];

    const quotations = await Quotation.find({
      _id: { $in: quotationIds },
      rfqId,
      status: {
        $in: ["SUBMITTED", "REVISED","AWARDED","PARTIALLY_AWARDED"],
      },
    });

    if (quotations.length !== quotationIds.length) {
      throw new ApiError(
        400,
        "Invalid quotation(s) provided",
      );
    }

    for (const award of awards) {
      const quotationItem =
        await QuotationItem.findOne({
          quotationId: award.quotationId,
          rfqItemId: award.rfqItemId,
        });

      if (!quotationItem) {
        throw new ApiError(
          400,
          `Item ${award.rfqItemId} not found in quotation ${award.quotationId}`,
        );
      }
    }

    //RESET OLD AWARDS
    await QuotationItem.updateMany(
      {
        quotationId: {
          $in: quotations.map(
            (quotation: any) => quotation._id,
          ),
        },
      },
      {
        $set: {
          isAwarded: false,
        },
      },
    );

    await Quotation.updateMany(
      { rfqId },
      {
        $set: {
          isSelected: false,
          approvedAt: null,
          approvedBy: null,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
          status: "REJECTED",
          isPartial: false,
        },
      },
    );

    // APPLY NEW AWARDS
    const awardedQuotationIds = new Set<string>();

    for (const award of awards) {
      await QuotationItem.updateOne(
        {
          quotationId: award.quotationId,
          rfqItemId: award.rfqItemId,
        },
        {
          $set: {
            isAwarded: true,
          },
        },
      );

      awardedQuotationIds.add(
        award.quotationId.toString(),
      );
    }

    //UPDATE QUOTATION STATUS
    const updatedQuotations =
      await Quotation.find({ rfqId });

    for (const quotation of updatedQuotations) {
      const quotationItems =
        await QuotationItem.find({
          quotationId: quotation._id,
        });

      const totalItems =
        quotationItems.length;

      const awardedItems =
        quotationItems.filter(
          (item: any) => item.isAwarded,
        ).length;

      if (awardedItems === 0) {
        quotation.status = "REJECTED";
        quotation.isPartial = false;

        quotation.rejectedAt = new Date();
        quotation.rejectedBy =
          user?.userId;

        quotation.rejectionReason =
          "Not selected in RFQ award";

        quotation.approvedAt = undefined;
        quotation.approvedBy = undefined;
      } else if (
        awardedItems === totalItems
      ) {
        quotation.status = "AWARDED";
        quotation.isPartial = false;

        quotation.isSelected = true;

        quotation.approvedAt =
          new Date();

        quotation.approvedBy =
          user?.userId;

        quotation.rejectedAt =
          undefined;

        quotation.rejectedBy =
          undefined;

        quotation.rejectionReason =
          undefined;
      } else {
        quotation.status =
          "PARTIALLY_AWARDED";

        quotation.isPartial = true;

        quotation.isSelected = true;

        quotation.approvedAt =
          new Date();

        quotation.approvedBy =
          user?.userId;

        quotation.rejectedAt =
          undefined;

        quotation.rejectedBy =
          undefined;

        quotation.rejectionReason =
          undefined;
      }

      await quotation.save();
    }

    //UPDATE RFQ STATUS
    const totalRFQItems = rfqItems.length;
    const awardedCount = awards.length;

    rfq.status =
      awardedCount === totalRFQItems
        ? "AWARDED"
        : "PARTIALLY_AWARDED";

    rfq.awardedAt = new Date();
    rfq.awardedBy = user?.userId;

    await rfq.save();

    //NEXT STEP => AUTO CREATE PO
    // await createPOFromAward(rfqId);

    return sendResponse({
      res,
      statusCode: 200,
      message: "RFQ awarded successfully",
      data: {
        rfqId,
        totalItems: totalRFQItems,
        awardedItems: awardedCount,
        awardedVendors:
          awardedQuotationIds.size,
      },
    });
  } catch (error) {
    next(error);
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
    const RFQItem = req.tenantConnection.model("RFQItem");
    const Quotation = req.tenantConnection.model("Quotation");

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

    // Cancel RFQ items
    await RFQItem.updateMany(
      { rfqId: rfq._id },
      { $set: { status: "CANCELLED" } },
    );

    await Quotation.updateMany(
      { rfqId: rfq._id },
      {
        $set: {
          status: "CANCELLED",
          rejectedBy: user?.userId,
          rejectedAt: new Date(),
          rejectionReason: reason || "RFQ Cancelled by client",
        },
      },
    );
    //neeed to send email to vendors

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
