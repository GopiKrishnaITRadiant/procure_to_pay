import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";

export const createTenantExchangeRate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { baseCurrency, targetCurrency, rate } = req.body;
    const tenantId = (req as any).user.tenantId;

    if (!baseCurrency || !targetCurrency || !rate) {
      throw new ApiError(400, "Missing required fields");
    }

    if (baseCurrency === targetCurrency) {
      throw new ApiError(400, "Currencies cannot be same");
    }

    const TenantFX = req.tenantConnection.model("TenantExchangeRate");

    const base = baseCurrency.toUpperCase();
    const target = targetCurrency.toUpperCase();
    const now = new Date();

    // 🔒 Close existing active rate
    await TenantFX.updateMany(
      {
        tenantId,
        baseCurrency: base,
        targetCurrency: target,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          validTo: now,
        },
      },
    );

    // ✅ Create new rate
    const doc = await TenantFX.create({
      tenantId,
      baseCurrency: base,
      targetCurrency: target,
      rate: rate.toString(),
      validFrom: now,
      isActive: true,
      source: "TENANT",
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Exchange rate created",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenantExchangeRate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { id } = req.params;
    const { rate } = req.body;
    const tenantId = (req as any).user.tenantId;

    if (!rate) {
      throw new ApiError(400, "Rate is required");
    }

    const TenantFX = req.tenantConnection.model("TenantExchangeRate");

    const existing = await TenantFX.findOne({
      _id: id,
      tenantId,
      isActive: true,
    });

    if (!existing) {
      throw new ApiError(404, "Active rate not found");
    }

    const now = new Date();

    // 🔒 Close old
    existing.isActive = false;
    existing.validTo = now;
    await existing.save();

    // ✅ Create new version
    const newDoc = await TenantFX.create({
      tenantId,
      baseCurrency: existing.baseCurrency,
      targetCurrency: existing.targetCurrency,
      rate: rate.toString(),
      validFrom: now,
      isActive: true,
      source: "TENANT",
    });

    return sendResponse({
      res,
      statusCode: 200,
      message: "Exchange rate updated",
      data: newDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTenantExchangeRates = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const tenantId = (req as any).user.tenantId;

    const {
      page = 1,
      limit = 10,
      baseCurrency,
      targetCurrency,
      isActive,
    } = req.query as any;

    const TenantFX = req.tenantConnection.model("TenantExchangeRate");

    const filter: any = { tenantId };

    if (baseCurrency) {
      filter.baseCurrency = baseCurrency.toUpperCase();
    }

    if (targetCurrency) {
      filter.targetCurrency = targetCurrency.toUpperCase();
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const data = await TenantFX.find(filter)
      .sort({ validFrom: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await TenantFX.countDocuments(filter);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Exchange rates fetched",
      data: {
        data,
        total,
        page: +page,
        pages: Math.ceil(total / +limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantExchangeRateById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { id } = req.params;
    const tenantId = (req as any).user.tenantId;

    const TenantFX = req.tenantConnection.model("TenantExchangeRate");

    const doc = await TenantFX.findOne({
      _id: id,
      tenantId,
    });

    if (!doc) {
      throw new ApiError(404, "Exchange rate not found");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Exchange rate fetched",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};
