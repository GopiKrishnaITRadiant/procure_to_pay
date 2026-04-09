import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";
import { executeIntegration } from "../../services/sdkIntegrationService";
import { getTenantConnection } from "../../core/tenantConnection";
import { ENV } from "../../config/env";

// in ui vendor can call kyc config api and in that api we will call this api
export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tenantIntegrationId } = req.params;
    const { type, country, category } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const tenantId = req.user?.tenantId;
    const vendorId = req.user?.vendorId;
    const userId = req.user?.userId;

    const Document = req.tenantConnection.model("Document");
    const Verification = req.tenantConnection.model("VendorVerification");
    const TenantIntegration = req.tenantConnection.model("TenantIntegration");
    const CountryKYCConfig = req.tenantConnection.model("CountryKYCConfig");

    const files = req.files;

    if (!Array.isArray(files) || files.length === 0) {
      throw new ApiError(400, "Files are required", "VALIDATION_ERROR");
    }

    const tenantIntegration = await TenantIntegration.findById(tenantIntegrationId);
    if (!tenantIntegration) {
      throw new ApiError(404, "Integration not found", "NOT_FOUND");
    }

    //KYC VALIDATION
    if (category === "KYC") {
      if (!country) {
        throw new ApiError(400, "Country is required for KYC", "VALIDATION_ERROR");
      }

      const config = await CountryKYCConfig.findOne({
        tenantId,
        country: country.toUpperCase(),
        isActive: true,
      }).sort({ version: -1 });

      if (!config) {
        throw new ApiError(400, "KYC config not found for country", "VALIDATION_ERROR");
      }

      const docConfig = config.documents.find((d: any) => d.type === type);

      if (!docConfig) {
        throw new ApiError(400, `Invalid document type: ${type}`, "VALIDATION_ERROR");
      }

      // 🔥 check multipleAllowed
      if (!docConfig.multipleAllowed) {
        const existingDocs = await Document.find({
          vendorId,
          category: "KYC",
          country: country.toUpperCase(),
          type,
        });

        if (existingDocs.length > 0) {
          throw new ApiError(
            400,
            `${type} already uploaded. Multiple not allowed`,
            "VALIDATION_ERROR"
          );
        }
      }
    }

    //PROFILE handling (replace existing)
    if (category === "PROFILE") {
      await Document.deleteMany({
        vendorId,
        category: "PROFILE",
        type,
      });
    }

    //Upload files one by one (FIXED)
    const payload = files.map((file) => ({
      key: `${category.toLowerCase()}/${vendorId}/${type}/${Date.now()}_${file.originalname}`,
      body: file.buffer,
      contentType: file.mimetype,
    }));

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

    const documentsToInsert = files.map((file, index) => {
      const key = payload[index]?.key;

      return {
        category,
        country: category === "KYC" ? country.toUpperCase() : null,
        documentCode: key,
        vendorId,
        type,
        fileName: file.originalname,
        fileUrl: key,
        mimeType: file.mimetype,
        uploadedBy: userId,
        tenantIntegrationId,
      };
    });

    const docs = await Document.insertMany(documentsToInsert);

    await Verification.findOneAndUpdate(
      { vendorId },
      { $inc: { "documents.total": files.length } },
      { upsert: true },
    );

    sendResponse({
      res,
      statusCode: 201,
      message: "Documents uploaded successfully",
      data: docs,
    });

  } catch (err) {
    next(err);
  }
};

export const getDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;

    const tenantConnection =
      process.env.NODE_ENV === "production"
        ? req.tenantConnection
        : await getTenantConnection("NOVA-26U3");

    if (!tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Document = tenantConnection.model("Document");
    const TenantIntegration = tenantConnection.model("TenantIntegration");

    const doc = await Document.findById(documentId);
    if (!doc) {
      throw new ApiError(404, "Document not found", "NOT_FOUND");
    }

    const tenantIntegration = await TenantIntegration.findById(doc.tenantIntegrationId);
    if (!tenantIntegration) {
      throw new ApiError(404, "Integration not found", "NOT_FOUND");
    }

    const stream = await executeIntegration(
      tenantConnection,
      tenantIntegration._id,
      "getObjectStream",
      {
        key: doc.documentCode,
      }
    );

    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${doc.fileName}"`
    );

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

export const getDocumentsByVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorId } = req.query;

    const tenantConnection =req.tenantConnection

    if (!tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Document = tenantConnection.model("Document");

    const docs = await Document.find({ vendorId: vendorId })
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

export const verifyDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { documentId, status, remarks } = req.body;
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const VendorDocument = req.tenantConnection.model("VendorDocument");
    const Verification = req.tenantConnection.model("Verification");

    const doc = await VendorDocument.findByIdAndUpdate(
      documentId,
      {
        status,
        verifiedBy: req.user?.userId,
        verifiedAt: new Date(),
        remarks,
      },
      { new: true },
    );

    if (status === "VERIFIED") {
      await Verification.updateOne(
        { vendorId: doc.vendorId },
        { $inc: { "documents.verified": 1 } },
      );
    }

    sendResponse({
      res,
      statusCode: 200,
      message: "Document verified",
      data: doc,
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

    const tenantId = req.user?.tenantId;
    const vendorId = req.user?.vendorId;

    const VendorKYC = req.tenantConnection.model("VendorKYC");
    const Verification = req.tenantConnection.model("VendorVerification");
    const Document = req.tenantConnection.model("Document");
    const CountryKYCConfig = req.tenantConnection.model("CountryKYCConfig");

    // get all uploaded KYC documents
    const docs = await Document.find({
      vendorId,
      category: "KYC",
    });

    if (!docs.length) {
      throw new ApiError(400, "No KYC documents uploaded", "VALIDATION_ERROR");
    }

    // group by country
    const docsByCountry = docs.reduce((acc: any, doc: any) => {
      if (!acc[doc.country]) acc[doc.country] = [];
      acc[doc.country].push(doc);
      return acc;
    }, {});

    // validate each country
    for (const country of Object.keys(docsByCountry)) {
      const config = await CountryKYCConfig.findOne({
        tenantId,
        country,
        isActive: true,
      }).sort({ version: -1 });

      if (!config) {
        throw new ApiError(400, `KYC config missing for ${country}`, "VALIDATION_ERROR");
      }

      const uploadedTypes = docsByCountry[country].map((d: any) => d.type);

      const requiredDocs = config.documents
        .filter((d: any) => d.required)
        .map((d: any) => d.type);

      const missing = requiredDocs.filter(
        (type: string) => !uploadedTypes.includes(type)
      );

      if (missing.length > 0) {
        throw new ApiError(
          400,
          `${country} missing documents: ${missing.join(", ")}`,
          "VALIDATION_ERROR"
        );
      }
    }

    const latestConfig = await CountryKYCConfig.findOne({
      tenantId,
      isActive: true,
    }).sort({ version: -1 });

    const kyc = await VendorKYC.findOneAndUpdate(
      { vendorId },
      {
        ...req.body,
        kycStatus: "UNDER_REVIEW",
        submittedAt: new Date(),
        kycConfigVersion: latestConfig?.version,
      },
      { returnDocument: "after", new: true },
    );

    await Verification.findOneAndUpdate(
      { vendorId },
      {
        "tax.taxId": req.body.taxId,
        overallStatus: "UNDER_REVIEW",
      },
      { returnDocument: "after" },
    );

    sendResponse({
      res,
      statusCode: 200,
      message: "KYC submitted successfully",
      data: kyc,
    });

  } catch (err) {
    next(err);
  }
};
