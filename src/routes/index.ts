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
import vendorRoutes from "./tenant/vendorRoutes"
import vendorAuthRoutes from "./tenant/vendorAuthRoutes"
import tenantAdminRoutes from "./tenant/tenantAdminRoutes"
import countryKYCConfigRoutes from "./countryKYCConfigRoutes"
import documentRoutes from "./tenant/documentRoutes"

const router = Router();
const apiRouter = Router();

//Public routes
apiRouter.use("/tenant/auth", authRoutes);
apiRouter.use("/super-admin", platformUserRoutes);
apiRouter.use("/tenant/vendor-user",vendorAuthRoutes)

//Protected routes
// apiRouter.use(authenticate);

//admin routes
apiRouter.use("/tenants", tenantRoutes);
apiRouter.use("/plans", planRoutes);
apiRouter.use("/integrations", integrationRoutes);
apiRouter.use("/integration-templates",integrationTemplateRoutes)
apiRouter.use("/terms",termsRoutes)
apiRouter.use("/countryKYCConfig",countryKYCConfigRoutes)

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

//Versioning
router.use("/api/v1", apiRouter);

export default router;