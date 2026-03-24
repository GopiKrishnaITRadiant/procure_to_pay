import cron from "node-cron";
import { IntegrationType } from "../types/tenantIntegrationTypes";
import { executeIntegration } from "../integrations/integrationService";
import { getTenantConnection } from "../core/tenantConnection";
import tenantModel from "../models/tenantModel";

export const startSAPCron = () => {

  const runJob = async () => {
    try {
      console.log("Running SAP PO Cron...");
      const tenants = await tenantModel.find({ status: "active" });

      for (const tenant of tenants) {
        try {

          console.log(`Running SAP fetch for tenant: ${tenant.name}`);

          const tenantConnection = await getTenantConnection(tenant.companyCode);

          const req: any = {
            tenantConnection
          };

          const tenantIntegrationModel = tenantConnection.model("TenantIntegration");

          const sapIntegration = await tenantIntegrationModel.findOne({
            integrationCode: "SAP",
            environment:"dev"
          });
          
          if (!sapIntegration) {
            console.log(`SAP not configured for tenant ${tenant.name}`);
            continue;
          }

          const response = await executeIntegration({
            req,
            tenantIntegrationId: sapIntegration._id,
            integrationCode: "SAP",
            resource: "purchaseOrders",
            operation: "list",
            payload: null,
            params: {}
          });

          console.log(`SAP PO for ${tenant.name}`);
          // console.log(response);

        } catch (err: any) {

          console.error(
            `Tenant ${tenant.name} failed:`,
            err.message
          );

        }
      }

    } catch (err: any) {
      console.error("SAP Cron failed:", err.message);
    }
  };

  runJob();

  cron.schedule("*/50 * * * *", runJob);
};