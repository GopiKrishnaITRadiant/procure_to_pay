import { IntegrationExecutor } from "../integrations/integrationExecutor";
import { integrationModel } from "../models/integrationModel";
import { decrypt } from "../utils/cryptoUtil";

export const executeIntegration = async (
  tenantConnection: any,
  tenantIntegrationId: string,
  action: string,
  payload: any
) => {
  const TenantIntegration =
    tenantConnection.model("TenantIntegration");

  const integration = await TenantIntegration.findById(
    tenantIntegrationId
  );

  if (!integration || !integration.isEnabled) {
    throw new Error("Integration not found or disabled");
  }

  const integrationDoc = await integrationModel.findById(
    integration.integrationId
  );

  if (!integrationDoc) {
    throw new Error("Integration config missing");
  }

  const executor = new IntegrationExecutor();

  return executor.execute(
    integrationDoc.code,      // STRIPE / S3 / EMAIL
    action,
    payload,
    integration.credentials
  );
};