import {Request, Response, NextFunction} from "express";
import { sendResponse } from "../../utils/sendResponse";
import { ApiError } from "../../utils/apiErrors";
import { Types } from "mongoose";

export const approveRegisteredVendor = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { vendorUserId } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");
    const VendorUser = req.tenantConnection.model("VendorUser");
    const VendorRole = req.tenantConnection.model("VendorRole");

    const user = await VendorUser.findById(vendorUserId);

    if (!user) {
      throw new ApiError(404, "Vendor user not found", "NOT_FOUND");
    }

    if (!user.isEmailVerified) {
      throw new ApiError(400, "Vendor email not verified", "EMAIL_NOT_VERIFIED");
    }

    const vendor = await Vendor.findById(user.vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "NOT_FOUND");
    }

    if (vendor.status === "BLOCKED") {
      throw new ApiError(400, "Vendor is blocked", "INVALID_STATE");
    }

    if (vendor.status === "APPROVED") {
      throw new ApiError(400, "Vendor already approved", "ALREADY_APPROVED");
    }

    const adminRole = await VendorRole.findOne({
      vendorId: vendor._id,
      name: "VENDOR_ADMIN",
    });

    if (!adminRole) {
      throw new ApiError(400, "ADMIN role not found", "ROLE_NOT_FOUND");
    }

    user.roleId = adminRole._id;
    await user.save();

    vendor.status = "APPROVED";
    vendor.approvedAt = new Date();
    vendor.approvedBy = new Types.ObjectId(req.user?.userId);

    await vendor.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Vendor approved and activated successfully",
      data: {
        vendor,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectVendor = async (req: Request, res: Response, next: NextFunction) => {
  const { vendorId } = req.params;
  const { reason } = req.body;

  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Vendor = req.tenantConnection.model("Vendor");

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "NOT_FOUND");
    }

    if (vendor.status !== "APPROVED") {
      throw new ApiError(400, "Only approved vendors can be rejected", "INVALID_STATE");
    }

    vendor.status = "REJECTED";
    vendor.rejectedReason = reason;
    vendor.isActive = false;

    await vendor.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Vendor rejected",
    });

  } catch (error) {
    next(error);
  }
};

export const verifyDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { vendorKycId, documentId, status, remarks } = req.body;

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      throw new ApiError(400, "Invalid status", "VALIDATION_ERROR");
    }

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Document = req.tenantConnection.model("Document");
    const Verification = req.tenantConnection.model("VendorVerification");
    const VendorKYC = req.tenantConnection.model("VendorKYC");

    const doc = await Document.findById(documentId);

    if (!doc) {
      throw new ApiError(404, "Document not found", "NOT_FOUND");
    }

    // Ensure document belongs to correct KYC
    if (vendorKycId && doc.vendorKycId?.toString() !== vendorKycId) {
      throw new ApiError(400, "Document does not belong to this KYC");
    }

    if (doc.status === "REPLACED") {
      throw new ApiError(400, "Document already replaced");
    }

    if (doc.status === "VERIFIED") {
      throw new ApiError(400, "Already verified");
    }

    // Get KYC using vendorKycId
    const kyc = await VendorKYC.findById(
      vendorKycId || doc.vendorKycId
    );

    if (!kyc) {
      throw new ApiError(404, "KYC not found");
    }

    // Only allow verification when UNDER_REVIEW
    if (kyc.kycStatus !== "UNDER_REVIEW") {
      throw new ApiError(
        400,
        `Cannot verify document when KYC is ${kyc.kycStatus}`
      );
    }

    //Update document
    doc.status = status;
    doc.verifiedBy = req.user?.userId;
    doc.verifiedAt = new Date();
    doc.remarks = remarks || "";

    await doc.save();

    //Update verification counters
    if (status === "VERIFIED") {
      await Verification.updateOne(
        { vendorId: doc.vendorId },
        { $inc: { "documents.verified": 1 } },
        { upsert: true }
      );
    }

    if (status === "REJECTED") {
      await Verification.updateOne(
        { vendorId: doc.vendorId },
        { $inc: { "documents.rejected": 1 } },
        { upsert: true }
      );
    }


    // If ANY doc rejected → reject entire KYC
    if (status === "REJECTED") {
      await VendorKYC.updateOne(
        { _id: kyc._id },
        {
          kycStatus: "REJECTED",
          verifiedAt: new Date(),
          verifiedBy: req.user?.userId,
        }
      );
    }

    // If VERIFIED → check if all docs verified
    if (status === "VERIFIED") {
      const pendingOrRejected = await Document.findOne({
        vendorKycId: kyc._id,
        documentType: "KYC",
        status: { $in: ["UNDER_REVIEW", "REJECTED"] },
      });

      // All docs verified → APPROVE KYC
      if (!pendingOrRejected) {
        await VendorKYC.updateOne(
          { _id: kyc._id },
          {
            kycStatus: "APPROVED",
            verifiedAt: new Date(),
            verifiedBy: req.user?.userId,
          }
        );
      }
    }

    sendResponse({
      res,
      statusCode: 200,
      message: `Document ${status.toLowerCase()} successfully`,
      data: doc,
    });

  } catch (err) {
    next(err);
  }
};