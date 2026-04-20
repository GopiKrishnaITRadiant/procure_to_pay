import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { generatePOCode } from "../../utils/codeGenerator";

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
    } = body;

    if (!vendorId || !Array.isArray(items) || items.length === 0 || !currency) {
      throw new ApiError(400, "Missing required fields");
    }

    currency = currency.trim().toUpperCase();

    const PO = tenantConnection.model("PurchaseOrder");
    const Vendor = tenantConnection.model("Vendor");
    const Material = tenantConnection.model("Material");

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new ApiError(400, "Vendor not found");
    }

    const purchaseOrderNumber = await generatePOCode(tenantConnection);

    const poItems: any[] = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];

      let {
        materialId,
        description,
        quantity,
        unitOfMeasure,
        netPrice,
        currency: itemCurrency,
        deliveryDate,
      } = item;

      const materialIds = items
        .filter((i: any) => i.materialId)
        .map((i: any) => i.materialId);

      const materials = await Material.find({ _id: { $in: materialIds } });

      const materialMap = new Map(
        materials.map((m: any) => [m._id.toString(), m]),
      );

      if (materialId && !materialMap.has(materialId)) {
        throw new ApiError(400, `Item ${index + 1}: Material not found`);
      }

      if (!description) {
        throw new ApiError(400, `Item ${index + 1}: description is required`);
      }

      if (!quantity || quantity <= 0) {
        throw new ApiError(400, `Item ${index + 1}: quantity must be > 0`);
      }

      if (netPrice == null || netPrice < 0) {
        throw new ApiError(400, `Item ${index + 1}: netPrice must be >= 0`);
      }

      if (itemCurrency) {
        itemCurrency = itemCurrency.trim().toUpperCase();
      }

      if (itemCurrency && itemCurrency !== currency) {
        throw new ApiError(
          400,
          `Item ${index + 1}: currency mismatch. Expected ${currency}, got ${itemCurrency}`,
        );
      }

      // Convert to integer (avoid float issues)
      const priceInMinor = Math.round(Number(netPrice) * 100);
      const qty = Number(quantity);

      poItems.push({
        itemNumber: `${(index + 1) * 10}`,
        description,
        quantity: qty,
        unitOfMeasure: unitOfMeasure || "EA",
        netPrice: Number(netPrice),
        currency,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,

        // internal (not stored unless you want)
        _priceInMinor: priceInMinor,
      });
    }

    // Calculate total safely
    const totalInMinor = poItems.reduce((sum, item) => {
      return sum + item._priceInMinor * item.quantity;
    }, 0);

    // Convert back to major currency
    const totalNetAmount = Number((totalInMinor / 100).toFixed(2));

    // Remove internal field
    poItems.forEach((item) => delete item._priceInMinor);

    const poPayload = {
      tenantId: user?.tenantId,
      purchaseOrderNumber,
      purchaseOrderType: "NB",
      companyCode,
      purchasingOrganization,
      purchasingGroup,
      vendorId,
      currency,
      creationDate: new Date(),
      purchaseOrderDate: new Date(),
      items: poItems,
      totalNetAmount,
      source: "DIRECT",
      status: "CREATED",
      createdBy: user?.userId,
    };

    const po = await PO.create(poPayload);

    return sendResponse({
      res,
      statusCode: 201,
      message: "Direct PO created successfully",
      data: po,
    });
  } catch (error) {
    next(error);
  }
}

export async function createRFQPurchaseOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { rfqId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const RFQ = req.tenantConnection.model("RFQ");
    const Quotation = req.tenantConnection.model("Quotation");
    const PO = req.tenantConnection.model("PurchaseOrder");

    const rfq = await RFQ.findById(rfqId);

    if (!rfq) throw new ApiError(404, "RFQ not found");

    if (!["AWARDED", "PARTIALLY_AWARDED"].includes(rfq.status)) {
      throw new ApiError(400, "RFQ not awarded yet");
    }

    // ❌ Prevent duplicate PO creation
    const existingPO = await PO.findOne({ rfqId });
    if (existingPO) {
      throw new ApiError(400, "PO already created for this RFQ");
    }

    // ✅ Fetch quotations
    const quotations = await Quotation.find({ rfqId });

    // ✅ Group awarded items by vendor
    const vendorMap: Record<string, any[]> = {};

    for (const quotation of quotations) {
      const awardedItems = quotation.items.filter((i: any) => i.isAwarded);

      if (awardedItems.length === 0) continue;

      const vendorId = quotation.vendorId.toString();

      if (!vendorMap[vendorId]) {
        vendorMap[vendorId] = [];
      }

      vendorMap[vendorId].push({
        quotationId: quotation._id,
        items: awardedItems,
      });
    }

    if (Object.keys(vendorMap).length === 0) {
      throw new ApiError(400, "No awarded items found");
    }

    const createdPOs: any[] = [];

    // ✅ Create PO per vendor
    for (const vendorId in vendorMap) {
      const vendorData = vendorMap[vendorId];

      if (!vendorData || vendorData.length === 0) continue;

      let itemCounter = 1;
      const poItems: any[] = [];

      vendorData.forEach((q) => {
        q.items.forEach((item: any) => {
          poItems.push({
            itemNumber: `${itemCounter++ * 10}`,
            quantity: item.quantity,
            unitOfMeasure: "EA", // adjust if needed
            netPrice: item.unitPrice,
            currency: quotation.currency || "INR",

            rfqId,
            rfqItemId: item.rfqItemId,
            quotationId: q.quotationId,

            deliveryDate: item.deliveryDate,
          });
        });
      });

      const totalNetAmount = poItems.reduce(
        (sum, i) => sum + i.netPrice * i.quantity,
        0,
      );

      const po = await PO.create({
        tenantId: req.user?.tenantId,
        purchaseOrderNumber: `PO-${Date.now()}-${vendorId.slice(-4)}`,
        purchaseOrderType: "NB",
        companyCode: rfq.companyCode || "1000",
        purchasingOrganization: rfq.purchasingOrganization || "1000",
        vendorId,
        currency: "INR",
        creationDate: new Date(),
        purchaseOrderDate: new Date(),
        items: poItems,
        totalNetAmount,
        source: "RFQ",
        status: "CREATED",
        rfqId,
        createdBy: req.user?.userId,
      });

      createdPOs.push(po);
    }

    // ✅ Update RFQ
    rfq.status = "PO_CREATED";
    await rfq.save();

    return sendResponse({
      res,
      statusCode: 201,
      message: "PO(s) created from RFQ successfully",
      data: createdPOs,
    });
  } catch (error) {
    next(error);
  }
}
