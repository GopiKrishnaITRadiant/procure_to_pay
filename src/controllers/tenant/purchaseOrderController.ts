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
  next: NextFunction
) {
  try {
    const { tenantConnection, user, params } = req;
    const { rfqId } = params;

    if (!tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const RFQ = tenantConnection.model("RFQ");
    const Quotation = tenantConnection.model("Quotation");
    const PO = tenantConnection.model("PurchaseOrder");

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) throw new ApiError(404, "RFQ not found");

    if (!["AWARDED", "PARTIALLY_AWARDED"].includes(rfq.status)) {
      throw new ApiError(400, "RFQ not awarded yet");
    }

    const quotations = await Quotation.find({ rfqId });

    //Group awarded items by vendor
    const vendorMap: Record<string, any[]> = {};

    for (const quotation of quotations) {
      const awardedItems = quotation.items.filter((i: any) => i.isAwarded);

      if (awardedItems.length === 0) continue;

      const vendorId = quotation.vendorId.toString();

      if (!vendorMap[vendorId]) {
        vendorMap[vendorId] = [];
      }

      vendorMap[vendorId].push({
        quotation,
        items: awardedItems,
      });
    }

    if (Object.keys(vendorMap).length === 0) {
      throw new ApiError(400, "No awarded items found");
    }

    const createdPOs = [];

    // Create PO per vendor
    for (const vendorId in vendorMap) {
      const entries = vendorMap[vendorId];
      if (!entries || entries.length === 0) continue;

      // Prevent duplicate PO per vendor
      const existingVendorPO = await PO.findOne({ rfqId, vendorId });
      if (existingVendorPO) continue;

      let itemCounter = 1;
      const poItems: any[] = [];
      let currency: string | null = null;

      for (const entry of entries) {
        const quotation = entry.quotation;

        if (!currency) currency = quotation.currency;
        if (currency !== quotation.currency) {
          throw new ApiError(
            400,
            "Multi-currency PO not supported for RFQ flow"
          );
        }

        for (const item of entry.items) {
          console.log(item);
          const priceInMinor = Math.round(Number(item.unitPrice) * 100);

          poItems.push({
            itemNumber: `${itemCounter++ * 10}`,
            description: item.description || "RFQ Item",
            quantity: Number(item.quantity),
            unitOfMeasure: item.unitOfMeasure || "EA",
            netPrice: Number(item.unitPrice),
            currency,
            deliveryDate: item.deliveryDate
              ? new Date(item.deliveryDate)
              : null,

            rfqId,
            rfqItemId: item.rfqItemId,
            quotationId: quotation._id,

            _priceInMinor: priceInMinor,
          });
        }
      }

      // Safe total calculation
      const totalInMinor = poItems.reduce(
        (sum, i) => sum + i._priceInMinor * i.quantity,
        0
      );

      const totalNetAmount = Number((totalInMinor / 100).toFixed(2));

      // remove internal
      poItems.forEach((i) => delete i._priceInMinor);

      const po = await PO.create({
        tenantId: user?.tenantId,
        purchaseOrderNumber: await generatePOCode(tenantConnection),
        purchaseOrderType: "NB",
        companyCode: rfq.companyCode||"DEFAULT",
        purchasingOrganization: rfq.purchasingOrganization||"DEFAULT",
        purchasingGroup: rfq.purchasingGroup,
        vendorId,
        currency,
        creationDate: new Date(),
        purchaseOrderDate: new Date(),
        items: poItems,
        totalNetAmount,
        source: "RFQ",
        status: "CREATED",
        rfqId,
        createdBy: user?.userId,
      });

      createdPOs.push(po);
    }

    if (createdPOs.length === 0) {
      throw new ApiError(400, "PO already created for all awarded vendors");
    }

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
