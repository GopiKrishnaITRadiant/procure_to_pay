import { Types } from "mongoose";
import { PERMISSIONS } from "../utils/permissions";

export const seedVendorRoles = async (
  VendorRole: any,
  vendorId: Types.ObjectId
) => {
  const existing = await VendorRole.find({ vendorId });

  if (existing.length > 0) return;

  const roles = ["ADMIN", "FINANCE", "VIEWER"];

  const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
    ADMIN: [
      PERMISSIONS.VENDOR_USER.PROFILE_READ,
      PERMISSIONS.VENDOR_USER.PROFILE_UPDATE,

      PERMISSIONS.VENDOR_USER.PO_READ,

      PERMISSIONS.VENDOR_USER.INVOICE_CREATE,
      PERMISSIONS.VENDOR_USER.INVOICE_READ,
      // PERMISSIONS.VENDOR_USER.INVOICE_UPDATE,

      PERMISSIONS.VENDOR_USER.PAYMENT_READ,

      PERMISSIONS.VENDOR_USER.KYC_UPLOAD,
      PERMISSIONS.VENDOR_USER.KYC_READ,
    ],

    FINANCE: [
      PERMISSIONS.VENDOR_USER.PROFILE_READ,

      PERMISSIONS.VENDOR_USER.PO_READ,

      PERMISSIONS.VENDOR_USER.INVOICE_CREATE,
      PERMISSIONS.VENDOR_USER.INVOICE_READ,

      PERMISSIONS.VENDOR_USER.PAYMENT_READ,
    ],

    VIEWER: [
      PERMISSIONS.VENDOR_USER.PROFILE_READ,
      PERMISSIONS.VENDOR_USER.PO_READ,
      PERMISSIONS.VENDOR_USER.INVOICE_READ,
      PERMISSIONS.VENDOR_USER.PAYMENT_READ,
    ],
  };

  const roleDocs = roles.map((role) => ({
    vendorId,
    name: role,
    permissions: ROLE_PERMISSIONS_MAP[role],
    isActive: true,
    createdAt: new Date(),
  }));

  await VendorRole.insertMany(roleDocs);
};