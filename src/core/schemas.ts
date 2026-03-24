import { userSchema } from "../models/tenant/userModel";
import { roleSchema } from "../models/tenant/rolesModel";
import { tenantAmountLimitSchema } from "../models/tenant/tenantAmountLimitModel";
import { TenantIntegrationSchema } from "../models/tenant/tenantIntegrationModel";
import {categorySchema} from "../models/tenant/categoryModel";
import { MaterialSchema } from "../models/tenant/materialsModel";
import { RequisitionSchema } from "../models/tenant/requisitionModel";
import { counterSchema } from "../models/tenant/counterModel";


export const schemas = {
  User: userSchema,
  Role: roleSchema,
  TenantAmountLimit:tenantAmountLimitSchema,
  TenantIntegration:TenantIntegrationSchema,
  Category:categorySchema,
  Material:MaterialSchema,
  Requisition:RequisitionSchema,
  Counter:counterSchema
};