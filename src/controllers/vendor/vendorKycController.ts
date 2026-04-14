import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { executeIntegration } from "../../services/sdkIntegrationService";
import { ENV } from "../../config/env";

export const uploadKycDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tenantIntegrationId } = req.params;
    const { documentCode, country } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const Document = req.tenantConnection.model("Document");
    const Verification = req.tenantConnection.model("VendorVerification");
    const TenantIntegration = req.tenantConnection.model("TenantIntegration");
    const CountryKYCConfig = req.tenantConnection.model("CountryKYCConfig");
    const VendorKYC = req.tenantConnection.model("VendorKYC");
    const Vendor = req.tenantConnection.model("Vendor");

    let vendorId: string;

    if (role === "ADMIN") {
      vendorId = req.body.vendorId?.trim();

      if (!vendorId) {
        throw new ApiError(400, "vendorId is required for admin");
      }

      const vendor = await Vendor.findOne({
        _id: vendorId,
        tenantId,
      });

      if (!vendor) {
        throw new ApiError(404, "Vendor not found in this tenant");
      }
    } else {
      vendorId = req.user?.vendorId as string;

      if (!vendorId) {
        throw new ApiError(400, "vendorId is required");
      }
    }

    if (!country || !documentCode) {
      throw new ApiError(400, "country & documentCode required");
    }

    const normalizedCountry = country.toUpperCase();
    const normalizedCode = documentCode.toUpperCase();

    const files = req.files;

    if (!Array.isArray(files) || files.length === 0) {
      throw new ApiError(400, "Files are required");
    }

    const tenantIntegration =
      await TenantIntegration.findById(tenantIntegrationId);

    if (!tenantIntegration) {
      throw new ApiError(404, "Integration not found");
    }

    // Validate KYC config
    const config = await CountryKYCConfig.findOne({
      tenantId,
      country: normalizedCountry,
      isActive: true,
    }).sort({ version: -1 });

    if (!config) {
      throw new ApiError(400, "KYC config not found");
    }

    const docConfig = config.documents.find(
      (d: any) => d.code.toUpperCase() === normalizedCode
    );

    if (!docConfig) {
      throw new ApiError(400, "Invalid KYC document");
    }

    // KYC Status Check (CRITICAL)
    const vendorKYC = await VendorKYC.findOne({
      vendorId,
      country: normalizedCountry,
    });

    if (vendorKYC?.kycStatus === "UNDER_REVIEW") {
      throw new ApiError(
        400,
        "KYC under review. Cannot upload documents"
      );
    }

    if (vendorKYC?.kycStatus === "APPROVED") {
      throw new ApiError(
        400,
        "KYC already approved. Upload not allowed"
      );
    }

    //  Prevent upload if already VERIFIED
    const verifiedDoc = await Document.findOne({
      vendorId,
      documentType: "KYC",
      country: normalizedCountry,
      documentCode: normalizedCode,
      status: "VERIFIED",
    });

    if (verifiedDoc) {
      throw new ApiError(
        400,
        `${normalizedCode} already verified`
      );
    }

    // Prevent duplicate if multiple not allowed
    if (!docConfig.multipleAllowed) {
      const existing = await Document.find({
        vendorId,
        documentType: "KYC",
        country: normalizedCountry,
        documentCode: normalizedCode,
        status: { $in: ["PENDING", "VERIFIED", "UNDER_REVIEW"] },
      });

      if (existing.length > 0) {
        throw new ApiError(
          400,
          `${normalizedCode} already uploaded`
        );
      }
    }

    // Replace rejected docs
    await Document.updateMany(
      {
        vendorId,
        documentType: "KYC",
        country: normalizedCountry,
        documentCode: normalizedCode,
        status: "REJECTED",
      },
      { status: "REPLACED" }
    );

    // Prepare upload payload
    const payload = files.map((file) => ({
      key: `kyc/${vendorId}/${Date.now()}_${file.originalname}`,
      body: file.buffer,
      contentType: file.mimetype,
    }));

    // Upload to storage (S3/Azure/etc)
    await Promise.all(
      payload.map((item) =>
        executeIntegration(
          req.tenantConnection,
          tenantIntegration._id,
          "upload",
          item
        )
      )
    );

    const docs = await Document.insertMany(
      files.map((file, index) => ({
        vendorId,
        userId,
        tenantIntegrationId,
        userType: role,
        documentType: "KYC",
        documentCode: normalizedCode,
        country: normalizedCountry,
        fileName: file.originalname,
        fileUrl: payload[index]?.key ?? "",
        mimeType: file.mimetype,
        status: "PENDING",
        uploadedBy: userId,
      }))
    );

    // 🔄 Sync verification
    // await syncVerificationDocuments(vendorId, Document, Verification);

    // Ensure KYC record exists (per country)
    await VendorKYC.updateOne(
      { vendorId, country: normalizedCountry },
      {
        $setOnInsert: {
          vendorId,
          country: normalizedCountry,
          kycStatus: "PENDING",
        },
      },
      { upsert: true }
    );

    sendResponse({
      res,
      statusCode: 201,
      message: "KYC documents uploaded successfully",
      data: docs,
    });

  } catch (err) {
    next(err);
  }
};

export const getKYCDocumentsByVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { vendorId, countryCode } = req.query;

    if (!vendorId) {
      throw new ApiError(400, "vendorId is required", "VALIDATION_ERROR");
    }

    if (!countryCode) {
      throw new ApiError(400, "countryCode is required", "VALIDATION_ERROR");
    }

    const tenantConnection = req.tenantConnection;

    if (!tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Document = tenantConnection.model("Document");

    const docs = await Document.find({ vendorId: vendorId, country: countryCode })
      .select("_id fileName mimeType type createdAt")
      .sort({ createdAt: -1 });

    const result = docs.map((doc: any) => ({
      id: doc._id,
      fileName: doc.fileName,
      type: doc.type,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
      url: `${ENV.BASE_URL}/v1/tenant/document/${doc._id}`,
    }));

    sendResponse({
      res,
      statusCode: 200,
      message: "Documents fetched successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const submitKYC = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const { countryCode } = req.body;

    if (!countryCode) {
      throw new ApiError(400, "Country is required", "VALIDATION_ERROR");
    }

    const tenantId = req.user?.tenantId;
    const isAdmin = req.user?.role.toUpperCase() === "ADMIN";

    const vendorId = isAdmin
      ? (req.body?.vendorId || "").trim()
      : req.user?.vendorId;

    if (!vendorId) {
      throw new ApiError(400, "Vendor ID is required", "VALIDATION_ERROR");
    }

    const VendorKYC = req.tenantConnection.model("VendorKYC");
    const Verification = req.tenantConnection.model("VendorVerification");
    const Document = req.tenantConnection.model("Document");
    const CountryKYCConfig = req.tenantConnection.model("CountryKYCConfig");

    const vendorKYC = await VendorKYC.findOne({
      vendorId,
      country: countryCode,
    });

    if (vendorKYC?.kycStatus === "UNDER_REVIEW") {
      throw new ApiError(
        400,
        `KYC already under review for ${countryCode}`,
        "KYC_ALREADY_SUBMITTED"
      );
    }

    if (vendorKYC?.kycStatus === "APPROVED") {
      throw new ApiError(
        400,
        `KYC already approved for ${countryCode}`,
        "KYC_ALREADY_APPROVED"
      );
    }

    // Only allow NEW or REJECTED
    if (vendorKYC &&!["PENDING", "REJECTED"].includes(vendorKYC.kycStatus)) {
      throw new ApiError(
        400,
        `KYC cannot be submitted in current state for ${countryCode}`,
        "INVALID_KYC_STATE"
      );
    }

    const alreadySubmitted = await Document.exists({
      vendorId,
      documentType: "KYC",
      country: countryCode,
      status: "UNDER_REVIEW",
    });

    if (alreadySubmitted) {
      throw new ApiError(
        400,
        `KYC already submitted for ${countryCode}`,
        "DUPLICATE_COUNTRY_SUBMISSION"
      );
    }

    const docs = await Document.find({
      vendorId,
      documentType: "KYC",
      country: countryCode,
      status: { $in: ["PENDING", "VERIFIED"] },
    });

    if (!docs.length) {
      throw new ApiError(
        400,
        `No KYC documents uploaded for ${countryCode}`,
        "VALIDATION_ERROR"
      );
    }

    const config = await CountryKYCConfig.findOne({
      tenantId,
      country: countryCode,
      isActive: true,
    }).sort({ version: -1 });

    if (!config) {
      throw new ApiError(
        400,
        `KYC config missing for ${countryCode}`,
        "VALIDATION_ERROR"
      );
    }

    const docCountMap: Record<string, number> = {};

    for (const doc of docs) {
      if (!doc.documentCode) continue;
      docCountMap[doc.documentCode] =
        (docCountMap[doc.documentCode] || 0) + 1;
    }

    for (const docConfig of config.documents) {
      if (!docConfig.required) continue;

      const uploadedCount = docCountMap[docConfig.code] || 0;
      const requiredCount = docConfig.requiredCount || 1;

      if (uploadedCount < requiredCount) {
        throw new ApiError(
          400,
          `${countryCode} missing ${docConfig.code} (required: ${requiredCount})`,
          "VALIDATION_ERROR"
        );
      }
    }

    const kyc = await VendorKYC.findOneAndUpdate(
      { vendorId, country: countryCode },
      {
        ...req.body,
        country: countryCode,
        kycStatus: "UNDER_REVIEW",
        submittedAt: new Date(),
        kycConfigVersion: config.version,
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    // Update verification (optional global)
    await Verification.findOneAndUpdate(
      { vendorId },
      {
        "tax.taxId": req.body?.taxId,
        overallStatus: "UNDER_REVIEW",
        documents: {
          total: docs.length,
          verified: 0,
          rejected:0,
        }
      },
      { returnDocument: "after" }
    );

    // Update ALL documents for this country
    await Document.updateMany(
      {
        vendorId,
        documentType: "KYC",
        country: countryCode,
        status: "PENDING",
      },
      {
        status: "UNDER_REVIEW",
        vendorKycId: kyc._id,
      }
    );

    sendResponse({
      res,
      statusCode: 200,
      message: `KYC submitted successfully for ${countryCode}`,
      data: kyc,
    });

  } catch (err) {
    next(err);
  }
};