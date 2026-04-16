import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { generateRFQNumber } from "../../utils/codeGenerator";
import { sendResponse } from "../../utils/sendResponse";

export const createRFQ = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { requisitionId, submissionDeadline, vendors, description, paymentTerms } = req.body;
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Requisition = req.tenantConnection.model("Requisition");
    const RFQ = req.tenantConnection.model("RFQ");
    const RFQItem = req.tenantConnection.model("RFQItem");

    const requisition = await Requisition.findById(requisitionId);

    if (!requisition) throw new ApiError(404, "Requisition not found");

    if (requisition.status !== "APPROVED") {
      throw new ApiError(400, "Only approved PR can create RFQ");
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

    const items = requisition.items.map((item:any) => ({
      rfqId: rfq._id,
      requisitionItemId: item._id,
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

export const sendRFQ = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { rfqId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) throw new ApiError(404, "RFQ not found");

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

export const submitQuotation = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { rfqId } = req.params;
    const { items, totalAmount, currency } = req.body;
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const Quotation = req.tenantConnection.model("Quotation");

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) throw new ApiError(404, "RFQ not found");

    if (rfq.status !== "SENT") {
      throw new ApiError(400, "RFQ not open for quotations");
    }

    const quotation = await Quotation.create({
      rfqId,
      vendorId: user?.vendorId,
      items,
      totalAmount,
      currency,
      submittedAt: new Date(),
    });

    // update RFQ status
    rfq.status = "QUOTATION_RECEIVED";
    await rfq.save();

    return sendResponse({
      res,
      statusCode: 201,
      message: "Quotation submitted",
      data: quotation,
    });

  } catch (err) {
    next(err);
  }
};

export const getRFQDetails = async (req:Request, res:Response, next:NextFunction) => {
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

export const getVendorRFQs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const RFQ = req.tenantConnection.model("RFQ");

    const vendorId = user?.vendorId;

    if (!vendorId) {
      throw new ApiError(400, "Vendor not found in user context");
    }

    const rfqs = await RFQ.find({
      vendors: vendorId,
      status: "SENT",
      submissionDeadline: { $gte: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Vendor RFQs fetched",
      data: rfqs,
    });

  } catch (err) {
    next(err);
  }
};

export const evaluateQuotation = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { quotationId } = req.params;
    const { score, remarks } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Quotation = req.tenantConnection.model("Quotation");

    const quotation = await Quotation.findById(quotationId);

    if (!quotation) throw new ApiError(404, "Quotation not found");

    quotation.evaluation = {
      score,
      remarks,
      evaluatedAt: new Date(),
    };

    await quotation.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Quotation evaluated",
      data: quotation,
    });

  } catch (err) {
    next(err);
  }
};

export const awardRFQ = async (req:Request, res:Response, next:NextFunction) => {
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

export const cancelRFQ = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { rfqId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const RFQ = req.tenantConnection.model("RFQ");

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) throw new ApiError(404, "RFQ not found");

    if (rfq.status === "AWARDED") {
      throw new ApiError(400, "Cannot cancel awarded RFQ");
    }

    rfq.status = "CANCELLED";

    await rfq.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "RFQ cancelled",
      data: rfq,
    });

  } catch (err) {
    next(err);
  }
};