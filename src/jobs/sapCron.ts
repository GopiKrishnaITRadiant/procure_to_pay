import cron from "node-cron";
import { getTenantConnection } from "../core/tenantConnection";
import tenantModel from "../models/tenantModel";
import { integrationModel } from "../models/integrationModel";
import { IntegrationTemplateModel } from "../models/integrationTemplateModel";
import pLimit from "p-limit";
import { processIntegration } from "../sap/processor/processIntegration";

const limit = pLimit(3);

let isRunning = false;

export const startSAPCron = () => {
  const runJob = async () => {
    if (isRunning) {
      console.log("Skipping overlapping cron");
      return;
    }

    isRunning = true;
    console.log("SAP Cron Started");

    try {
      const tenants = await tenantModel.find({
        status: "active",
        hasSAPIntegration: true,
      });

      if (!tenants.length) {
        console.log("No SAP tenants");
        return;
      }

      await Promise.allSettled(
        tenants.map((tenant) =>
          limit(async () => {
            try {
              console.log(`Tenant: ${tenant.name}`);
              const tenantConnection = await getTenantConnection(
                tenant.companyCode,
              );

              const TenantIntegration =
                tenantConnection.model("TenantIntegration");

              const integrations: any = await TenantIntegration.find({
                isEnabled: true,
                environment: "prod",
                templateId: { $exists: true },
              }).lean();

              if (!integrations.length) {
                console.log(`No integrations for ${tenant.name}`);
                return;
              }

              for (const integration of integrations) {
                await processIntegration(
                  tenantConnection,
                  integration,
                  IntegrationTemplateModel,
                );
                console.log(`Processing integration: ${integration.name}`);
              }
            } catch (err: any) {
              console.error(`Tenant failed: ${tenant.name}`, err.message);
            }
          }),
        ),
      );
    } catch (err: any) {
      console.error("Cron failed:", err.message);
    } finally {
      isRunning = false;
    }
  };

  runJob();
  cron.schedule("5 * * * *", runJob);
};
