import { userSchema } from "../models/tenant/userModel";
import { roleSchema } from "../models/tenant/rolesModel";
import { tenantAmountLimitSchema } from "../models/tenant/tenantAmountLimitModel";
import { TenantIntegrationSchema } from "../models/tenant/tenantIntegrationModel";
import {categorySchema} from "../models/tenant/categoryModel";
import { MaterialSchema } from "../models/tenant/materialsModel";
import { RequisitionSchema } from "../models/tenant/requisitionModel";
import { counterSchema } from "../models/tenant/counterModel";
import { VendorSchema } from "../models/tenant/vendorModel";
import { VendorUserSchema } from "../models/tenant/vendorUserModel";
import { VendorKYCSchema } from "../models/tenant/vendorKycModel";
import { VendorBankSchema } from "../models/tenant/vendorBankModel";
import { documentSchema } from "../models/tenant/documentModel";
import { VerificationSchema } from "../models/tenant/vendorVerificationModel";
import { VendorRoleSchema } from "../models/tenant/vendorRoleModel";
import { CountryKYCConfigSchema } from "../models/tenant/countryKYCConfigModel";

export const schemas = {
  User: userSchema,
  Role: roleSchema,
  TenantAmountLimit:tenantAmountLimitSchema,
  TenantIntegration:TenantIntegrationSchema,
  Category:categorySchema,
  Material:MaterialSchema,
  Requisition:RequisitionSchema,
  Counter:counterSchema,
  Vendor:VendorSchema,
  VendorUser:VendorUserSchema,
  VendorVerification:VerificationSchema,
  VendorKYC:VendorKYCSchema,
  Document:documentSchema,
  venodrBank:VendorBankSchema,
  VendorRole:VendorRoleSchema,
  CountryKYCConfig:CountryKYCConfigSchema,
};