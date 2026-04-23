import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { planMiddleware } from "../middlewares/planMiddleware";

import platformUserRoutes from "./platformUserRoutes";
import integrationRoutes from "./integrationRoutes";
import authRoutes from "./tenant/authRoutes";
import rolesRoutes from "./tenant/roleRoutes";
import tenantRoutes from "./tenantRoutes";
import planRoutes from "./planRoutes";
import tenantSubscriptionRoutes from "./tenantSubscriptionRoutes";
import tenantIntegrationRoutes from "./tenant/tenantIntegrationRoutes";
import tenantAmoutLimitRoutes from "./tenant/tenantAmountLimitRoutes"
import tenantUserRoutes from "./tenant/userRouts"
import integrationTemplateRoutes from "./integrationTemplateRoutes"
import termsRoutes from "./termsRoutes"
import categoryRoutes from "./tenant/categoryRoutes"
import materialRoutes from "./tenant/materialRoutes"
import requisitionRoutes from "./tenant/requisitionRoutes"
import vendorRoutes from "./vendor/vendorRoutes"
import vendorAuthRoutes from "./vendor/vendorAuthRoutes"
import tenantAdminRoutes from "./tenant/tenantAdminRoutes"
import countryKYCConfigRoutes from "./countryKYCConfigRoutes"
import documentRoutes from "./tenant/documentRoutes"
import vendorKycRoutes from "./vendor/vendorKycRoutes"
import rfqRoutes from "./tenant/rfqRoutes"
import quotationRoutes from "./vendor/quotationRoutes"
import purchaseOrderRoutes from "./tenant/purchaseOrderRoutes"
import uomRoutes from "./uomRoutes"
import uomConversionRoutes from "./uomConverstionRoutes"
import currencyRoutes from "./currencyRoutes"
import exchangeRateRoutes from "./exchangeRateRoutes"
import tenantExchangeRoutes from "./tenant/tenantExchangeRoutes"

const router = Router();
const apiRouter = Router();

//Public routes
apiRouter.use("/tenant/auth", authRoutes);
apiRouter.use("/super-admin", platformUserRoutes);
apiRouter.use("/tenant/vendor-user",vendorAuthRoutes)

//Protected routes
apiRouter.use(authenticate);

//admin routes
apiRouter.use("/tenants", tenantRoutes);
apiRouter.use("/plans", planRoutes);
apiRouter.use("/integrations", integrationRoutes);
apiRouter.use("/integration-templates",integrationTemplateRoutes)
apiRouter.use("/terms",termsRoutes)
apiRouter.use("/countryKYCConfig",countryKYCConfigRoutes)
apiRouter.use("/uom",uomRoutes)
apiRouter.use("/uom-conversions",uomConversionRoutes)
apiRouter.use("/currency",currencyRoutes)
apiRouter.use("/exchange-rate",exchangeRateRoutes)

//tenant admin routes
apiRouter.use("/tenant/admin",tenantAdminRoutes)

//tenant routes
apiRouter.use("/tenant/roles", rolesRoutes);
apiRouter.use("/tenant/user",tenantUserRoutes);
apiRouter.use("/tenant/integration", tenantIntegrationRoutes);
apiRouter.use("/tenant/subscriptions", tenantSubscriptionRoutes);
apiRouter.use("/tenant/amount-limit",tenantAmoutLimitRoutes)
apiRouter.use("/tenant/category",categoryRoutes)
apiRouter.use("/tenant/material",materialRoutes)
apiRouter.use("/tenant/requisition",requisitionRoutes)
apiRouter.use("/tenant/vendor",vendorRoutes)
apiRouter.use("/tenant/document",documentRoutes)
apiRouter.use("/vendor/",vendorKycRoutes)
apiRouter.use("/tenant-rfq",rfqRoutes)
apiRouter.use("/vendor-quotation",quotationRoutes)
apiRouter.use("/tenant/purchase-order",purchaseOrderRoutes)
apiRouter.use("/tenant-exchange-rates",tenantExchangeRoutes)

//Versioning
router.use("/api/v1", apiRouter);

export default router;