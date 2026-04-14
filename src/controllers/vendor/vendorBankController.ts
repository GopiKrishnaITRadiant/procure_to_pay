import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { decrypt, encrypt } from "../../utils/cryptoUtil";

//need to add bank verification process
export const addVendorBank = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      accountNumber,
      confirmAccountNumber,
      accountName,
      bankName,
      branch,
      ifsc,
    } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const vendorId = req.user?.vendorId;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    const VendorBank = req.tenantConnection.model("VendorBank");

    if (
      !accountNumber ||
      !confirmAccountNumber ||
      !accountName ||
      !bankName 
      // !ifsc
    ) {
      throw new ApiError(400, "Missing required fields", "VALIDATION_ERROR");
    }

    if (accountNumber !== confirmAccountNumber) {
      throw new ApiError(
        400,
        "Account numbers do not match",
        "VALIDATION_ERROR",
      );
    }

    const normalizedIFSC = ifsc?.trim().toUpperCase();
    const normalizedAccount = accountNumber.trim();

    const encryptedAccountNumber = encrypt(normalizedAccount);

    const existingBank = await VendorBank.findOne({
      accountNumber: encryptedAccountNumber,
      ...(userType === "VENDOR" ? { vendorId } : { userId }),
    });

    if (existingBank) {
      throw new ApiError(400, "Bank already exists", "DUPLICATE_BANK");
    }

    const existingPrimary = await VendorBank.findOne({
      isPrimary: true,
      ...(userType === "VENDOR" ? { vendorId } : { userId }),
    });

    const maskedAccountNumber = "XXXXXX" + normalizedAccount.slice(-4);

    const bank = await VendorBank.create({
      accountNumber: encryptedAccountNumber,
      maskedAccountNumber,
      accountHolderName: accountName.trim(),
      bankName: bankName.trim(),
      branch: branch?.trim(),
      ifsc: normalizedIFSC,
      isPrimary: !existingPrimary,
      status: "PENDING",
      userType,
      vendorId: userType === "VENDOR" ? vendorId : undefined,
      userId: userType === "TENANT" ? userId : undefined,
    });

    const safeBank = {
      _id: bank._id,
      accountHolderName: bank.accountHolderName,
      bankName: bank.bankName,
      branch: bank.branch,
      ifsc: bank.ifsc,
      maskedAccountNumber: bank.maskedAccountNumber,
      isPrimary: bank.isPrimary,
      status: bank.status,
      createdAt: bank.createdAt,
    };

    return sendResponse({
      res,
      statusCode: 201,
      message: "Bank added successfully",
      data: safeBank,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyBank = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { bankId, status } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const VendorBank = req.tenantConnection.model("VendorBank");
    const Verification = req.tenantConnection.model("Verification");

    const bank = await VendorBank.findByIdAndUpdate(
      bankId,
      {
        status,
        verifiedAt: new Date(),
      },
      { new: true },
    );

    await Verification.updateOne(
      { vendorId: bank.vendorId },
      {
        "bank.status": status === "VERIFIED" ? "VERIFIED" : "FAILED",
      },
    );

    sendResponse({
      res,
      statusCode: 200,
      message: "Bank verified",
      data: bank,
    });
  } catch (err) {
    next(err);
  }
};

export const getVendorBanks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const VendorBank = req.tenantConnection.model("VendorBank");

    const vendorId = req.user?.vendorId;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    const query =
      userType === "VENDOR"
        ? { vendorId }
        : { userId };

    const banks = await VendorBank.find(query).sort({ createdAt: -1 });

    const safeBanks = banks.map((bank: any) => ({
      _id: bank._id,
      accountHolderName: bank.accountHolderName,
      bankName: bank.bankName,
      branch: bank.branch,
      ifsc: bank.ifsc,
      maskedAccountNumber: bank.maskedAccountNumber,
      isPrimary: bank.isPrimary,
      status: bank.status,
      createdAt: bank.createdAt,
    }));

    sendResponse({
      res,
      statusCode: 200,
      message: "Banks fetched successfully",
      data: safeBanks,
    });
  } catch (err) {
    next(err);
  }
};

export const updateVendorBank = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bankId } = req.params;
    const { accountHolderName, bankName, branch, ifsc, isPrimary } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const VendorBank = req.tenantConnection.model("VendorBank");

    const vendorId = req.user?.vendorId;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    const query =
      userType === "VENDOR"
        ? { _id: bankId, vendorId }
        : { _id: bankId, userId };

    const bank = await VendorBank.findOne(query);

    if (!bank) {
      throw new ApiError(404, "Bank not found", "NOT_FOUND");
    }

    // DO NOT allow updating account number
    if (bank.status === "VERIFIED") {
      throw new ApiError(400, "Verified bank cannot be modified", "INVALID_STATE");
    }

    if (isPrimary) {
      await VendorBank.updateMany(
        userType === "VENDOR" ? { vendorId } : { userId },
        { isPrimary: false }
      );
    }

    const updated = await VendorBank.findByIdAndUpdate(
      bankId,
      {
        accountHolderName,
        bankName,
        branch,
        ifsc: ifsc?.toUpperCase(),
        isPrimary,
        status: "PENDING",
      },
      { returnDocument: "after" }
    );

    sendResponse({
      res,
      statusCode: 200,
      message: "Bank updated successfully",
      data: {
        _id: updated._id,
        accountHolderName: updated.accountHolderName,
        bankName: updated.bankName,
        branch: updated.branch,
        ifsc: updated.ifsc,
        maskedAccountNumber: updated.maskedAccountNumber,
        isPrimary: updated.isPrimary,
        status: updated.status,
      },
    });

  } catch (err) {
    next(err);
  }
};

export const deleteVendorBank = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bankId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const VendorBank = req.tenantConnection.model("VendorBank");

    const vendorId = req.user?.vendorId;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    const query =
      userType === "VENDOR"
        ? { _id: bankId, vendorId }
        : { _id: bankId, userId };

    const bank = await VendorBank.findOne(query);

    if (!bank) {
      throw new ApiError(404, "Bank not found", "NOT_FOUND");
    }

    if (bank.isPrimary) {
      throw new ApiError(400, "Primary bank cannot be deleted", "INVALID_STATE");
    }

    if (bank.status === "VERIFIED") {
      throw new ApiError(400, "Verified bank cannot be deleted", "INVALID_STATE");
    }

    await VendorBank.findByIdAndDelete(bankId);

    sendResponse({
      res,
      statusCode: 200,
      message: "Bank deleted successfully",
    });

  } catch (err) {
    next(err);
  }
};